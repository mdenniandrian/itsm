<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChangeApproval;
use App\Models\ChangeRequest;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;

class ChangeRequestController extends Controller
{
    public function index(Request $request)
    {
        $query = ChangeRequest::with(['requester', 'assignee', 'approvals.approver']);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('change_type', $request->type);
        }

        if ($request->filled('risk') && $request->risk !== 'all') {
            $query->where('risk_level', $request->risk);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('change_number', 'like', "%{$s}%")
                  ->orWhere('title', 'like', "%{$s}%")
                  ->orWhere('description', 'like', "%{$s}%");
            });
        }

        $changes = $query->orderBy('created_at', 'desc')->get()->map(function ($c) {
            return [
                'id' => $c->id,
                'change_number' => $c->change_number,
                'title' => $c->title,
                'description' => $c->description,
                'change_type' => $c->change_type,
                'impact' => $c->impact,
                'risk_level' => $c->risk_level,
                'priority' => $c->priority,
                'status' => $c->status,
                'requester_name' => $c->requester?->name,
                'assignee_name' => $c->assignee?->name,
                'scheduled_start_at' => $c->scheduled_start_at?->toIso8601String(),
                'scheduled_end_at' => $c->scheduled_end_at?->toIso8601String(),
                'approvals_count' => $c->approvals->count(),
                'pending_approvals_count' => $c->approvals->where('status', 'pending')->count(),
                'created_at' => $c->created_at->toIso8601String(),
            ];
        });

        return response()->json([
            'changes' => $changes,
            'total' => $changes->count(),
        ]);
    }

    public function stats()
    {
        $all = ChangeRequest::all();
        return response()->json([
            'total_changes' => $all->count(),
            'pending_approval' => $all->where('status', 'pending_approval')->count(),
            'scheduled' => $all->where('status', 'scheduled')->count(),
            'implementing' => $all->where('status', 'implementing')->count(),
            'closed' => $all->where('status', 'closed')->count(),
            'high_risk' => $all->whereIn('risk_level', ['high', 'critical'])->count(),
        ]);
    }

    public function show($id)
    {
        $change = ChangeRequest::with(['requester', 'assignee', 'approvals.approver'])->find($id);
        if (!$change) {
            return response()->json(['error' => 'Change Request not found'], 404);
        }
        return response()->json($change);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'change_type' => 'required|in:standard,normal,emergency',
            'impact' => 'required|in:low,medium,high',
            'risk_level' => 'required|in:low,medium,high,critical',
            'priority' => 'required|in:low,medium,high,critical',
            'assigned_to' => 'nullable|exists:users,id',
            'implementation_plan' => 'nullable|string',
            'rollback_plan' => 'nullable|string',
            'test_plan' => 'nullable|string',
            'scheduled_start_at' => 'nullable|date',
            'scheduled_end_at' => 'nullable|date',
        ]);

        $prefix = 'CHG-' . date('ym') . '-';
        $count = ChangeRequest::where('change_number', 'like', "{$prefix}%")->count() + 1;
        $changeNumber = $prefix . str_pad($count, 5, '0', STR_PAD_LEFT);

        $initialStatus = $validated['change_type'] === 'standard' ? 'approved' : 'pending_approval';

        $change = ChangeRequest::create([
            'change_number' => $changeNumber,
            'title' => $validated['title'],
            'description' => $validated['description'],
            'change_type' => $validated['change_type'],
            'impact' => $validated['impact'],
            'risk_level' => $validated['risk_level'],
            'priority' => $validated['priority'],
            'status' => $initialStatus,
            'requester_id' => $user->id,
            'assigned_to' => $validated['assigned_to'] ?? $user->id,
            'implementation_plan' => $validated['implementation_plan'] ?? null,
            'rollback_plan' => $validated['rollback_plan'] ?? null,
            'test_plan' => $validated['test_plan'] ?? null,
            'scheduled_start_at' => $validated['scheduled_start_at'] ?? null,
            'scheduled_end_at' => $validated['scheduled_end_at'] ?? null,
        ]);

        // If normal or emergency change, create CAB approval stages for managers/admins
        if ($change->change_type !== 'standard') {
            $managers = User::whereIn('role', ['admin', 'manager'])->get();
            foreach ($managers as $mgr) {
                ChangeApproval::create([
                    'change_request_id' => $change->id,
                    'approver_id' => $mgr->id,
                    'stage' => 'CAB Review',
                    'status' => 'pending',
                ]);

                Notification::create([
                    'user_id' => $mgr->id,
                    'title' => 'Change Request Approval Required',
                    'message' => "Change {$change->change_number}: {$change->title} requires your approval.",
                    'type' => 'warning',
                ]);
            }
        }

        return response()->json($change, 201);
    }

    public function updateStatus(Request $request, $id)
    {
        $change = ChangeRequest::find($id);
        if (!$change) {
            return response()->json(['error' => 'Change Request not found'], 404);
        }

        $validated = $request->validate([
            'status' => 'required|in:draft,submitted,pending_approval,approved,rejected,scheduled,implementing,review,closed,cancelled',
            'review_notes' => 'nullable|string',
        ]);

        $up = ['status' => $validated['status']];
        if ($validated['status'] === 'implementing' && !$change->actual_start_at) {
            $up['actual_start_at'] = now();
        }
        if (in_array($validated['status'], ['review', 'closed']) && !$change->actual_end_at) {
            $up['actual_end_at'] = now();
        }
        if (isset($validated['review_notes'])) {
            $up['review_notes'] = $validated['review_notes'];
        }

        $change->update($up);

        return response()->json([
            'message' => "Change Request status updated to {$change->status}",
            'change' => $change,
        ]);
    }

    public function decideApproval(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied: Only Managers/Admins can provide CAB approval.'], 403);
        }

        $change = ChangeRequest::find($id);
        if (!$change) {
            return response()->json(['error' => 'Change Request not found'], 404);
        }

        $validated = $request->validate([
            'decision' => 'required|in:approved,rejected',
            'comments' => 'nullable|string',
        ]);

        $approval = ChangeApproval::where('change_request_id', $change->id)
            ->where('approver_id', $user->id)
            ->first();

        if (!$approval) {
            $approval = ChangeApproval::create([
                'change_request_id' => $change->id,
                'approver_id' => $user->id,
                'stage' => 'CAB Review',
            ]);
        }

        $approval->update([
            'status' => $validated['decision'],
            'comments' => $validated['comments'] ?? null,
            'decided_at' => now(),
        ]);

        // Check overall decision
        if ($validated['decision'] === 'rejected') {
            $change->update(['status' => 'rejected']);
        } else {
            // If approved, update status to scheduled or approved
            $change->update(['status' => 'scheduled']);
        }

        return response()->json([
            'message' => "CAB decision recorded successfully ({$validated['decision']})",
            'change' => $change,
        ]);
    }
}
