<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Problem;
use App\Models\Ticket;
use App\Models\TicketComment;
use App\Models\TicketHistory;
use Illuminate\Http\Request;

class ProblemController extends Controller
{
    public function index(Request $request)
    {
        $query = Problem::with(['owner', 'tickets']);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('priority') && $request->priority !== 'all') {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('problem_number', 'like', "%{$s}%")
                  ->orWhere('title', 'like', "%{$s}%")
                  ->orWhere('root_cause', 'like', "%{$s}%");
            });
        }

        $problems = $query->orderBy('created_at', 'desc')->get()->map(function ($p) {
            return [
                'id' => $p->id,
                'problem_number' => $p->problem_number,
                'title' => $p->title,
                'description' => $p->description,
                'status' => $p->status,
                'priority' => $p->priority,
                'impact' => $p->impact,
                'root_cause' => $p->root_cause,
                'workaround' => $p->workaround,
                'permanent_solution' => $p->permanent_solution,
                'owner_name' => $p->owner?->name,
                'linked_tickets_count' => $p->tickets->count(),
                'resolved_at' => $p->resolved_at?->toIso8601String(),
                'created_at' => $p->created_at->toIso8601String(),
            ];
        });

        return response()->json([
            'problems' => $problems,
            'total' => $problems->count(),
        ]);
    }

    public function stats()
    {
        $all = Problem::all();
        return response()->json([
            'total_problems' => $all->count(),
            'investigating' => $all->where('status', 'investigating')->count(),
            'known_errors' => $all->where('status', 'known_error')->count(),
            'solution_found' => $all->where('status', 'solution_found')->count(),
            'resolved' => $all->whereIn('status', ['resolved', 'closed'])->count(),
        ]);
    }

    public function show($id)
    {
        $problem = Problem::with(['owner', 'tickets.requester', 'tickets.assignee'])->find($id);
        if (!$problem) {
            return response()->json(['error' => 'Problem not found'], 404);
        }
        return response()->json($problem);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'agent', 'superadmin'])) {
            return response()->json(['error' => 'Access denied: Only IT Support can record Problems.'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'priority' => 'required|in:critical,high,medium,low',
            'impact' => 'required|in:critical,major,minor',
            'root_cause' => 'nullable|string',
            'workaround' => 'nullable|string',
            'permanent_solution' => 'nullable|string',
            'ticket_ids' => 'nullable|array',
            'ticket_ids.*' => 'exists:tickets,id',
        ]);

        $prefix = 'PRB-' . date('ym') . '-';
        $count = Problem::where('problem_number', 'like', "{$prefix}%")->count() + 1;
        $problemNumber = $prefix . str_pad($count, 5, '0', STR_PAD_LEFT);

        $problem = Problem::create([
            'problem_number' => $problemNumber,
            'title' => $validated['title'],
            'description' => $validated['description'],
            'priority' => $validated['priority'],
            'impact' => $validated['impact'],
            'status' => 'investigating',
            'root_cause' => $validated['root_cause'] ?? null,
            'workaround' => $validated['workaround'] ?? null,
            'permanent_solution' => $validated['permanent_solution'] ?? null,
            'owner_id' => $user->id,
        ]);

        if (!empty($validated['ticket_ids'])) {
            Ticket::whereIn('id', $validated['ticket_ids'])->update(['problem_id' => $problem->id]);
        }

        return response()->json($problem, 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'agent', 'superadmin'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $problem = Problem::find($id);
        if (!$problem) {
            return response()->json(['error' => 'Problem not found'], 404);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'status' => 'sometimes|in:logged,investigating,known_error,solution_found,resolved,closed',
            'priority' => 'sometimes|in:critical,high,medium,low',
            'impact' => 'sometimes|in:critical,major,minor',
            'root_cause' => 'nullable|string',
            'workaround' => 'nullable|string',
            'permanent_solution' => 'nullable|string',
        ]);

        if (isset($validated['status']) && in_array($validated['status'], ['resolved', 'closed']) && !$problem->resolved_at) {
            $validated['resolved_at'] = now();
        }

        $problem->update($validated);

        return response()->json([
            'message' => 'Problem record updated successfully',
            'problem' => $problem,
        ]);
    }

    public function linkTickets(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'agent', 'superadmin'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $problem = Problem::find($id);
        if (!$problem) {
            return response()->json(['error' => 'Problem not found'], 404);
        }

        $validated = $request->validate([
            'ticket_ids' => 'required|array',
            'ticket_ids.*' => 'exists:tickets,id',
        ]);

        Ticket::whereIn('id', $validated['ticket_ids'])->update(['problem_id' => $problem->id]);

        return response()->json([
            'message' => 'Incident tickets linked to this Master Problem successfully.',
            'linked_count' => count($validated['ticket_ids']),
        ]);
    }

    public function resolveAllLinked(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'agent', 'superadmin'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $problem = Problem::with('tickets')->find($id);
        if (!$problem) {
            return response()->json(['error' => 'Problem not found'], 404);
        }

        $validated = $request->validate([
            'permanent_solution' => 'required|string',
            'resolution_comment' => 'nullable|string',
        ]);

        $problem->update([
            'status' => 'resolved',
            'permanent_solution' => $validated['permanent_solution'],
            'resolved_at' => now(),
        ]);

        $commentText = $validated['resolution_comment'] ?: "This ticket has been resolved automatically because Master Problem ({$problem->problem_number}: {$problem->title}) has been resolved with solution: {$validated['permanent_solution']}";

        $linkedCount = 0;
        foreach ($problem->tickets as $ticket) {
            if ($ticket->status !== 'resolved' && $ticket->status !== 'closed') {
                $ticket->update([
                    'status' => 'resolved',
                    'resolved_at' => now(),
                ]);

                TicketComment::create([
                    'ticket_id' => $ticket->id,
                    'user_id' => $user->id,
                    'content' => $commentText,
                    'is_internal' => false,
                ]);

                TicketHistory::create([
                    'ticket_id' => $ticket->id,
                    'user_id' => $user->id,
                    'action' => 'resolved_via_problem',
                ]);

                Notification::create([
                    'user_id' => $ticket->requester_id,
                    'title' => 'Your Ticket Has Been Resolved',
                    'message' => "Ticket {$ticket->ticket_number} was resolved via Root Cause Problem Resolution.",
                    'type' => 'success',
                    'ticket_id' => $ticket->id,
                ]);

                $linkedCount++;
            }
        }

        return response()->json([
            'message' => "Problem {$problem->problem_number} resolved successfully and {$linkedCount} linked tickets have been closed.",
            'problem' => $problem,
            'resolved_tickets_count' => $linkedCount,
        ]);
    }
}
