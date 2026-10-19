"""Vanilla Hermes plugin registration for Project Stewardship."""
from __future__ import annotations

import argparse
import json
import shlex
from pathlib import Path
from typing import Any, Optional

from .bot_context import project_memory_hook
from .cycles.engine import CycleRefused
from .persistence.service import ServiceError, StewardshipService
from .persistence.store import Store
from .runtime import bot_db_path, mark_hermes_host, open_store
from .security.untrusted import UNTRUSTED_NOTE, frame_untrusted


class PluginState:
    """Process-wide service wiring owned by the plugin lifecycle."""

    _store: Optional[Store] = None
    _svc: Optional[StewardshipService] = None
    db_path: Optional[Path] = None

    @classmethod
    def services(cls) -> StewardshipService:
        if cls._svc is None:
            # A bot in another profile reads Project Stewardship where it runs (normally the
            # root profile) instead of opening an empty copy in its own profile
            # (checks round 1). Otherwise the usual resolution and its checks.
            cls._store = open_store(cls.db_path if cls.db_path is not None else bot_db_path())
            cls._svc = StewardshipService(cls._store)
            # Review bug 2: the plugin tool path proposes initiatives, so it
            # must raise approval notifications like every other interface.
            from .events.notifications import wire_notification_stack

            wire_notification_stack(cls._store, cls._svc)
        return cls._svc

    @classmethod
    def reset(cls) -> None:
        if cls._store is not None:
            cls._store.close()
        cls._store = None
        cls._svc = None


def tool_steward_status(project_id: str = "") -> dict:
    """Settings, health and the delivery-ladder summary for one project.

    The ladder block reports derived states only (computed at read time from
    stored links, task statuses and check results). No percentages, no blended
    scores, no forecasts: unknown is reported as unknown.

    Without a project id it lists the enabled projects (id, phase, autonomy,
    latest health), so an agent never has to guess an id. (Local patch
    2026-10-17, see project/Research/tools/hermes-project-stewardship-review.md.)
    """
    svc = PluginState.services()
    if not str(project_id or "").strip():
        projects = []
        for row in svc.list_projects():
            if not row.get("enabled"):
                continue
            health = svc.latest_health(row["project_id"])
            projects.append({
                "project_id": row["project_id"],
                "phase": row["phase"],
                "autonomy_level": row["autonomy_level"],
                "health": health["status"] if health else "never-verified",
            })
        return {"projects": projects}
    out = {"settings": svc.settings(project_id), "health": svc.latest_health(project_id)}
    try:
        from .kanban import ReferenceKanbanAdapter
        from .persistence.canonical_work_service import CanonicalWorkService
        from .persistence.ladder_service import LadderService
        from .persistence.roadmap_service import RoadmapService

        store = PluginState._store
        if store is None:
            out["ladder"] = {"state": "unavailable"}
            return out
        work = CanonicalWorkService(store, ReferenceKanbanAdapter(store))
        roadmap = RoadmapService(store, svc, work)
        ladder = LadderService(store, svc, work, roadmap)
        project = roadmap.roadmap(project_id)["projects"][0]
        out["ladder"] = {
            "work_host": project["work_host"],
            "goals": {s: sum(1 for g in project["goals"] if g["state"] == s)
                      for s in ("not_started", "in_progress", "met", "at_risk", "unknown")},
            "objectives": {s: sum(1 for o in project["objectives"] if o["state"] == s)
                           for s in ("not_started", "in_progress", "met", "at_risk", "unknown")},
            "milestones": {
                "reached": sum(1 for m in project["milestones"] if m["state"] == "reached"),
                "not_reached": sum(1 for m in project["milestones"]
                                   if m["state"] == "not_reached"),
                "overdue": sum(1 for m in project["milestones"] if m["overdue"]),
            },
            "ready_to_confirm": [i["ref"] for i in project["initiatives"]
                                 if i["ready_to_confirm"]],
            "not_placed": {kind: len(rows)
                           for kind, rows in project["not_placed"].items()},
            "needs_placing": len(project["needs_placing"]),
        }
    except Exception:  # noqa: BLE001 - status must never fail on an optional block
        out["ladder"] = {"state": "unavailable"}
    return out


def tool_steward_run_cycle(project_id: str, idempotency_key: Optional[str] = None) -> dict:
    from .cycles.engine import CycleEngine

    return CycleEngine(PluginState.services()).run_cycle(
        project_id, idempotency_key=idempotency_key
    )


def tool_steward_propose_initiative(
    project_id: str,
    title: str,
    rationale: str,
    expected_outcome: str = "",
    risk: str = "medium",
    dedupe_key: Optional[str] = None,
) -> dict:
    return PluginState.services().propose_initiative(
        project_id,
        title=title,
        rationale=rationale,
        expected_outcome=expected_outcome,
        risk=risk,
        dedupe_key=dedupe_key,
    )


# Approval/rejection are intentionally not model tools. They remain on authenticated
# RPC/dashboard and permission-bound gateway surfaces.
TOOLS = {
    "steward_status": tool_steward_status,
    "steward_run_cycle": tool_steward_run_cycle,
    "steward_propose_initiative": tool_steward_propose_initiative,
}

# Model-facing descriptions (local patch 2026-10-17): the upstream schema only
# repeated the tool name, so agents could not tell when or how to call these.
_PROJECT_ID_DOC = (
    "Stewardship project id (the project slug, e.g. 'spb-perps'). "
    "Call steward_status without arguments to list the ids."
)
_TOOL_DESCRIPTIONS = {
    "steward_status": (
        "Read-only state of a Project Stewardship project: settings (mission, phase, "
        "autonomy level, members, policies), the latest health snapshot "
        "(healthy/watch/degraded/unknown/critical, with evidence) and the delivery-ladder "
        "summary (goals/objectives/milestones by state, initiatives ready to confirm, "
        "items not placed). Without project_id it lists the enabled projects with their "
        "phase and latest health. Use it before planning or reporting on a project."
    ),
    "steward_run_cycle": (
        "Run one verification cycle for a project now: collect git and declared-file "
        "evidence, evaluate every enabled objective (command checks run allowlisted "
        "programs when autonomy >= 3; manual ones read the latest human assessment), "
        "record a health snapshot and return the objective results and "
        "mutation_blocked_reason. Limited to 6 cycles per project per day; a cycle that "
        "cannot run answers {\"refused\": reason}. Run it at the start of a review pass, "
        "before proposing work."
    ),
    "steward_propose_initiative": (
        "Propose an initiative (a bounded unit of project work) to the human Approval "
        "Inbox. Nothing is approved or executed until a person approves it in the app; "
        "approval is never a model action. The rationale must cite concrete evidence "
        "(file paths, numbers, objective results). Use dedupe_key "
        "'<project>:<topic-slug>'. Duplicates, the open-initiative cap and suppression "
        "after a rejection answer {\"refused\": reason}: accept it, do not retry under "
        "another key."
    ),
}

_TOOL_PROPERTIES = {
    "steward_status": {
        "project_id": {"type": "string", "description": _PROJECT_ID_DOC},
    },
    "steward_run_cycle": {
        "project_id": {"type": "string", "description": _PROJECT_ID_DOC},
        "idempotency_key": {
            "type": "string",
            "description": "Optional. The same key never runs a second cycle.",
        },
    },
    "steward_propose_initiative": {
        "project_id": {"type": "string", "description": _PROJECT_ID_DOC},
        "title": {"type": "string", "description": "Short imperative title, at most 120 characters."},
        "rationale": {
            "type": "string",
            "description": "Why now, with evidence: report paths, numbers, failing objective names.",
        },
        "expected_outcome": {
            "type": "string",
            "description": "What will be true when it is done and which objective or metric shows it.",
        },
        "risk": {"type": "string", "enum": ["low", "medium", "high"]},
        "dedupe_key": {"type": "string", "description": "'<project>:<topic-slug>', stable for one topic."},
    },
}
_TOOL_REQUIRED = {
    "steward_status": [],
    "steward_run_cycle": ["project_id"],
    "steward_propose_initiative": ["project_id", "title", "rationale"],
}


def _tool_handler(fn):
    def handle(args=None, **_kwargs):
        # A refusal (paused, frozen, budget, duplicate, unknown project) is an
        # answer the agent must read, not a tool crash. Answers and refusals
        # alike carry text the code did not write, so both are framed as data.
        try:
            result = fn(**dict(args or {}))
        except (CycleRefused, ServiceError) as refusal:
            result = {"refused": str(refusal)}
        return json.dumps(frame_untrusted(result), sort_keys=True, default=str, ensure_ascii=False)

    return handle


def _schema(name: str) -> dict:
    return {
        "name": name,
        "description": f"{_TOOL_DESCRIPTIONS[name]} {UNTRUSTED_NOTE}",
        "parameters": {
            "type": "object",
            "properties": _TOOL_PROPERTIES[name],
            "required": _TOOL_REQUIRED[name],
            "additionalProperties": False,
        },
    }


def _slash_routes() -> dict[str, Any]:
    svc = PluginState.services

    def _observation_host():
        """Resolve the observation read surface from the native host.

        Uses the same factory as the API/bridge; when the host is
        unavailable the slash command reports the honest refusal (recovery
        without a host cannot verify anything).
        """
        from .kanban.host_adapter import create_project_kanban_adapter

        try:
            return create_project_kanban_adapter().host
        except Exception:
            return None

    def status(raw_args: str):
        project_id = raw_args.strip()
        if not project_id:
            return "usage: /project-status <project-id>"
        settings = svc().settings(project_id)
        health = svc().latest_health(project_id)
        state = health["status"] if health else "never-verified"
        return f"{project_id}: {state} | phase={settings['phase']} | L{settings['autonomy_level']}"

    def initiatives(raw_args: str):
        project_id = raw_args.strip()
        if not project_id:
            return "usage: /project-initiatives <project-id>"
        rows = svc().initiatives(project_id)
        return "\n".join(f"{r['ref']} [{r['status']}] {r['title']}" for r in rows) or "(none)"

    def pause(raw_args: str):
        parts = shlex.split(raw_args)
        if len(parts) != 1:
            return "usage: /project-pause <project-id>"
        result = svc().pause(parts[0])
        return f"{parts[0]} phase={result['phase']}"

    def reconcile(raw_args: str):
        from .observation.recovery import ReconcileService

        parts = shlex.split(raw_args)
        if len(parts) != 1:
            return "usage: /project-reconcile <project-id>"
        project_id = parts[0]
        s = svc()
        try:
            s.require_feature(project_id, "reconciliation")
        except Exception as e:
            return f"refused: {e}"
        recovery = ReconcileService(
            s.store, _observation_host(), engine=None, service=s,
        )
        try:
            report = recovery.reconcile(
                project_id, actor="cli", interface="slash", trigger_type="manual"
            )
        except Exception as e:
            return f"refused: {e}"
        return (
            f"{project_id}: recovered={len(report['recovered'])}"
            f" observations_run={report['observations_run']}"
        )

    return {
        "project-status": status,
        "project-initiatives": initiatives,
        "project-pause": pause,
        "project-reconcile": reconcile,
    }


def _setup_cli(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("args", nargs=argparse.REMAINDER)


def _run_cli(namespace: argparse.Namespace) -> int:
    from .cli.app import main

    return main(list(namespace.args))


def register(runtime: Any) -> dict:
    """Register only APIs shipped by vanilla Hermes PluginContext."""
    # Only the Hermes host calls register(): this is the host's explicit signal
    # that the profile default database may be used (P addendum fix 2, Quan D1).
    mark_hermes_host()
    registered = {"tools": [], "commands": [], "hooks": []}
    for name, fn in TOOLS.items():
        try:
            runtime.register_tool(
                name=name,
                toolset="project-stewardship",
                schema=_schema(name),
                handler=_tool_handler(fn),
            )
        except AttributeError:
            break
        registered["tools"].append(name)

    for name, handler in _slash_routes().items():
        try:
            runtime.register_command(
                name=name,
                handler=handler,
                description=name.replace("-", " "),
                args_hint="<project-id>",
            )
        except AttributeError:
            break
        registered["commands"].append(name)

    skill_path = Path(__file__).resolve().parents[2] / "skill" / "project-stewardship"
    if skill_path.is_dir():
        try:
            runtime.register_skill("project-stewardship", skill_path)
        except AttributeError:
            pass

    try:
        runtime.register_cli_command(
            name="stewardship",
            help="Project Stewardship control plane",
            setup_fn=_setup_cli,
            handler_fn=_run_cli,
        )
    except AttributeError:
        pass

    # Project memory for bots working on a project (checks round 1, pick 1b).
    try:
        runtime.register_hook("pre_llm_call", project_memory_hook)
    except AttributeError:
        pass
    else:
        registered["hooks"].append("pre_llm_call")
    return registered
