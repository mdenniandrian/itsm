<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $user = $request->user();
        $query = Ticket::query();

        if ($user->role === 'user') {
            $query->where('requester_id', $user->id);
        }

        $all = (clone $query)->get();

        $today = now()->startOfDay();

        return response()->json([
            'total' => $all->count(),
            'open' => $all->where('status', 'open')->count(),
            'in_progress' => $all->where('status', 'in_progress')->count(),
            'pending' => $all->where('status', 'pending')->count(),
            'resolved' => $all->where('status', 'resolved')->count(),
            'closed' => $all->where('status', 'closed')->count(),
            'critical' => $all->where('priority', 'critical')->whereIn('status', ['open', 'in_progress', 'pending'])->count(),
            'unassigned' => $all->whereNull('assignee_id')->whereIn('status', ['open', 'in_progress', 'pending'])->count(),
            'sla_breached' => $all->where('sla_resolution_breached', true)->whereIn('status', ['open', 'in_progress', 'pending'])->count(),
            'resolved_today' => $all->where('status', 'resolved')->filter(fn ($t) => $t->resolved_at && $t->resolved_at >= $today)->count(),
        ]);
    }

    public function byStatus(Request $request)
    {
        $user = $request->user();
        $query = Ticket::query();
        if ($user->role === 'user') {
            $query->where('requester_id', $user->id);
        }

        $statuses = ['open', 'in_progress', 'pending', 'resolved', 'closed'];
        $counts = $query->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $result = collect($statuses)->map(function ($s) use ($counts) {
            return [
                'status' => $s,
                'count' => $counts[$s] ?? 0,
            ];
        });

        return response()->json($result);
    }

    public function byPriority(Request $request)
    {
        $user = $request->user();
        $query = Ticket::whereIn('status', ['open', 'in_progress', 'pending']);
        if ($user->role === 'user') {
            $query->where('requester_id', $user->id);
        }

        $priorities = ['critical', 'high', 'medium', 'low'];
        $counts = $query->select('priority', DB::raw('count(*) as count'))
            ->groupBy('priority')
            ->pluck('count', 'priority');

        $result = collect($priorities)->map(function ($p) use ($counts) {
            return [
                'priority' => $p,
                'count' => $counts[$p] ?? 0,
            ];
        });

        return response()->json($result);
    }

    public function byCategory(Request $request)
    {
        $user = $request->user();
        $query = Ticket::query();
        if ($user->role === 'user') {
            $query->where('requester_id', $user->id);
        }

        $categories = ['incident', 'service_request', 'problem', 'change_request'];
        $counts = $query->select('category', DB::raw('count(*) as count'))
            ->groupBy('category')
            ->pluck('count', 'category');

        $result = collect($categories)->map(function ($c) use ($counts) {
            return [
                'category' => $c,
                'count' => $counts[$c] ?? 0,
            ];
        });

        return response()->json($result);
    }

    public function trend(Request $request)
    {
        $days = min(60, max(7, (int) ($request->days ?? 30)));
        $user = $request->user();

        $data = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $start = $date->copy()->startOfDay();
            $end = $date->copy()->endOfDay();
            $dateStr = $date->format('Y-m-d');

            $createdQ = Ticket::whereBetween('created_at', [$start, $end]);
            $resolvedQ = Ticket::whereNotNull('resolved_at')->whereBetween('resolved_at', [$start, $end]);

            if ($user->role === 'user') {
                $createdQ->where('requester_id', $user->id);
                $resolvedQ->where('requester_id', $user->id);
            }

            $data[] = [
                'date' => $dateStr,
                'created' => $createdQ->count(),
                'resolved' => $resolvedQ->count(),
            ];
        }

        return response()->json($data);
    }

    public function agentPerformance()
    {
        $agents = User::whereIn('role', ['admin', 'manager', 'agent'])
            ->where('is_active', true)
            ->get();

        $result = $agents->map(function ($agent) {
            $assigned = Ticket::where('assignee_id', $agent->id)->get();
            $resolved = $assigned->whereIn('status', ['resolved', 'closed']);
            $active = $assigned->whereIn('status', ['open', 'in_progress', 'pending']);

            $resolutionHours = [];
            foreach ($resolved as $t) {
                if ($t->resolved_at && $t->created_at) {
                    $resolutionHours[] = $t->created_at->diffInHours($t->resolved_at);
                }
            }

            $avgHrs = count($resolutionHours) > 0 ? round(array_sum($resolutionHours) / count($resolutionHours), 1) : null;

            return [
                'id' => $agent->id,
                'name' => $agent->name,
                'department' => $agent->department,
                'total_assigned' => $assigned->count(),
                'resolved' => $resolved->count(),
                'active' => $active->count(),
                'avg_resolution_hrs' => $avgHrs,
            ];
        })->sortByDesc('resolved')->values();

        return response()->json($result);
    }

    public function recentTickets(Request $request)
    {
        $user = $request->user();
        $query = Ticket::with('requester');

        if ($user->role === 'user') {
            $query->where('requester_id', $user->id);
        }

        $tickets = $query->orderBy('created_at', 'desc')->take(6)->get()->map(function ($t) {
            return [
                'id' => $t->id,
                'ticket_number' => $t->ticket_number,
                'title' => $t->title,
                'status' => $t->status,
                'priority' => $t->priority,
                'category' => $t->category,
                'created_at' => $t->created_at->toIso8601String(),
            ];
        });

        return response()->json($tickets);
    }

    public function slaBreaches(Request $request)
    {
        $query = Ticket::with('assignee')
            ->where('sla_resolution_breached', true)
            ->whereIn('status', ['open', 'in_progress', 'pending']);

        $tickets = $query->orderBy('created_at', 'asc')->take(10)->get()->map(function ($t) {
            return [
                'id' => $t->id,
                'ticket_number' => $t->ticket_number,
                'title' => $t->title,
                'priority' => $t->priority,
                'status' => $t->status,
                'assignee_name' => $t->assignee?->name,
            ];
        });

        return response()->json($tickets);
    }
}
