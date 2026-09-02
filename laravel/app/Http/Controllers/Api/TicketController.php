<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\SlaPolicy;
use App\Models\Ticket;
use App\Models\TicketComment;
use App\Models\TicketHistory;
use App\Services\AuditLogger;
use App\Services\EmailNotificationService;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TicketController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Ticket::with(['requester', 'assignee', 'slaPolicy']);

        // End users can only see their own tickets
        if ($user->role === 'user') {
            $query->where('requester_id', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('ticket_number', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $limit = max(1, min((int) ($request->limit ?? 15), 100));
        $page = max(1, (int) ($request->page ?? 1));

        $total = $query->count();
        $tickets = $query->orderBy('created_at', 'desc')
            ->skip(($page - 1) * $limit)
            ->take($limit)
            ->get();

        $formatted = $tickets->map(function ($t) {
            return [
                'id' => $t->id,
                'ticket_number' => $t->ticket_number,
                'title' => $t->title,
                'description' => $t->description,
                'status' => $t->status,
                'priority' => $t->priority,
                'category' => $t->category,
                'requester_id' => $t->requester_id,
                'requester_name' => $t->requester?->name,
                'requester_email' => $t->requester?->email,
                'requester_department' => $t->requester?->department,
                'assignee_id' => $t->assignee_id,
                'assignee_name' => $t->assignee?->name,
                'sla_name' => $t->slaPolicy?->name,
                'sla_resolution_due' => $t->sla_resolution_due?->toIso8601String(),
                'sla_resolution_breached' => $t->sla_resolution_breached,
                'satisfaction_rating' => $t->satisfaction_rating,
                'satisfaction_feedback' => $t->satisfaction_feedback,
                'problem_id' => $t->problem_id,
                'service_catalog_id' => $t->service_catalog_id,
                'comment_count' => $t->comments()->count(),
                'created_at' => $t->created_at->toIso8601String(),
                'updated_at' => $t->updated_at->toIso8601String(),
            ];
        });

        return response()->json([
            'tickets' => $formatted,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'pages' => ceil($total / $limit) ?: 1,
            ]
        ]);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();
        $ticket = Ticket::with(['requester', 'assignee', 'slaPolicy', 'comments.user', 'history.user'])->find($id);

        if (!$ticket) {
            return response()->json(['error' => 'Ticket not found'], 404);
        }

        if ($user->role === 'user' && $ticket->requester_id !== $user->id) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $comments = $ticket->comments->filter(function ($c) use ($user) {
            if ($user->role === 'user' && $c->is_internal) return false;
            return true;
        })->map(function ($c) {
            return [
                'id' => $c->id,
                'content' => $c->content,
                'is_internal' => $c->is_internal,
                'created_at' => $c->created_at->toIso8601String(),
                'user_id' => $c->user_id,
                'user_name' => $c->user?->name,
                'user_role' => $c->user?->role,
            ];
        })->values();

        $history = $ticket->history->map(function ($h) {
            return [
                'id' => $h->id,
                'action' => $h->action,
                'field_name' => $h->field_name,
                'old_value' => $h->old_value,
                'new_value' => $h->new_value,
                'changed_at' => $h->created_at->toIso8601String(),
                'user_name' => $h->user?->name,
            ];
        });

        return response()->json([
            'id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'title' => $ticket->title,
            'description' => $ticket->description,
            'status' => $ticket->status,
            'priority' => $ticket->priority,
            'category' => $ticket->category,
            'requester_id' => $ticket->requester_id,
            'requester_name' => $ticket->requester?->name,
            'requester_email' => $ticket->requester?->email,
            'requester_department' => $ticket->requester?->department,
            'assignee_id' => $ticket->assignee_id,
            'assignee_name' => $ticket->assignee?->name,
            'sla_name' => $ticket->slaPolicy?->name,
            'sla_response_due' => $ticket->sla_response_due?->toIso8601String(),
            'sla_resolution_due' => $ticket->sla_resolution_due?->toIso8601String(),
            'sla_response_breached' => $ticket->sla_response_breached,
            'sla_resolution_breached' => $ticket->sla_resolution_breached,
            'first_response_at' => $ticket->first_response_at?->toIso8601String(),
            'resolved_at' => $ticket->resolved_at?->toIso8601String(),
            'closed_at' => $ticket->closed_at?->toIso8601String(),
            'satisfaction_rating' => $ticket->satisfaction_rating,
            'satisfaction_feedback' => $ticket->satisfaction_feedback,
            'rated_at' => $ticket->rated_at?->toIso8601String(),
            'problem_id' => $ticket->problem_id,
            'service_catalog_id' => $ticket->service_catalog_id,
            'created_at' => $ticket->created_at->toIso8601String(),
            'updated_at' => $ticket->updated_at->toIso8601String(),
            'comments' => $comments,
            'history' => $history,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'priority' => 'required|in:critical,high,medium,low',
            'category' => 'required|in:incident,service_request,problem,change_request',
            'assignee_id' => 'nullable|exists:users,id',
        ]);

        $sla = SlaPolicy::where('priority', $validated['priority'])->where('is_active', true)->first();
        $responseDue = $sla ? now()->addHours($sla->response_hours) : now()->addHours(24);
        $resolutionDue = $sla ? now()->addHours($sla->resolution_hours) : now()->addHours(72);

        $datePrefix = 'TKT-' . date('ym') . '-';
        $count = Ticket::where('ticket_number', 'like', "{$datePrefix}%")->count() + 1;
        $ticketNumber = $datePrefix . str_pad($count, 5, '0', STR_PAD_LEFT);

        $ticket = Ticket::create([
            'ticket_number' => $ticketNumber,
            'title' => $validated['title'],
            'description' => $validated['description'],
            'status' => 'open',
            'priority' => $validated['priority'],
            'category' => $validated['category'],
            'requester_id' => $user->id,
            'assignee_id' => in_array($user->role, ['admin', 'manager', 'agent']) ? ($validated['assignee_id'] ?? null) : null,
            'sla_policy_id' => $sla?->id,
            'sla_response_due' => $responseDue,
            'sla_resolution_due' => $resolutionDue,
        ]);

        TicketHistory::create([
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'action' => 'created',
        ]);

        AuditLogger::logTicket(
            'CREATE',
            "Ticket #{$ticket->ticket_number} submitted by {$user->name}: '{$ticket->title}' [Priority: {$ticket->priority}, Category: {$ticket->category}].",
            $ticket,
            null,
            $ticket->only(['ticket_number', 'title', 'status', 'priority', 'category', 'assignee_id'])
        );

        if ($ticket->assignee_id) {
            Notification::create([
                'user_id' => $ticket->assignee_id,
                'title' => 'New Ticket Assigned',
                'message' => "You have been assigned to ticket {$ticket->ticket_number}: {$ticket->title}",
                'type' => 'info',
                'ticket_id' => $ticket->id,
            ]);
        }

        // Automatic Add-on dispatch: Email Notification & Telegram (Non-blocking background defer)
        defer(function () use ($ticket) {
            try {
                EmailNotificationService::sendTicketCreated($ticket);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Failed to dispatch ticket created email: ' . $e->getMessage());
            }

            try {
                TelegramService::sendTicketNotification($ticket, 'created');
            } catch (\Exception $e) {}
        });

        return response()->json($ticket, 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $ticket = Ticket::find($id);

        if (!$ticket) {
            return response()->json(['error' => 'Ticket not found'], 404);
        }

        // IDOR & RBAC Protection: Users can only edit title/description of their own tickets
        if ($user->role === 'user') {
            if ($ticket->requester_id !== $user->id) {
                return response()->json(['error' => 'Access denied: You can only modify your own tickets.'], 403);
            }
            $validated = $request->validate([
                'title' => 'sometimes|string|max:255',
                'description' => 'sometimes|string',
            ]);
        } else {
            $validated = $request->validate([
                'title' => 'sometimes|string|max:255',
                'description' => 'sometimes|string',
                'status' => 'sometimes|in:open,in_progress,pending,resolved,closed',
                'priority' => 'sometimes|in:critical,high,medium,low',
                'category' => 'sometimes|in:incident,service_request,problem,change_request',
                'assignee_id' => 'nullable|exists:users,id',
            ]);
        }

        // If resolving, set resolved_at
        if (isset($validated['status']) && $validated['status'] === 'resolved' && !$ticket->resolved_at) {
            $validated['resolved_at'] = now();
        }

        // If closing, set closed_at
        if (isset($validated['status']) && $validated['status'] === 'closed' && !$ticket->closed_at) {
            $validated['closed_at'] = now();
        }

        $oldValues = $ticket->only(array_keys($validated));

        // Record history
        foreach ($validated as $field => $newValue) {
            $oldValue = $ticket->$field;
            if ($oldValue != $newValue) {
                TicketHistory::create([
                    'ticket_id' => $ticket->id,
                    'user_id' => $user->id,
                    'action' => 'updated',
                    'field_name' => $field,
                    'old_value' => (string) $oldValue,
                    'new_value' => (string) $newValue,
                ]);
            }
        }

        $oldAssigneeId = $ticket->assignee_id;
        $oldStatus = $ticket->status;
        $ticket->update($validated);
        $newValues = $ticket->only(array_keys($validated));

        if (isset($validated['status']) && $validated['status'] !== $oldStatus) {
            AuditLogger::logTicket(
                'STATUS_CHANGE',
                "Ticket #{$ticket->ticket_number} status updated from '{$oldStatus}' to '{$ticket->status}' by {$user->name}.",
                $ticket,
                ['status' => $oldStatus],
                ['status' => $ticket->status]
            );
        } else {
            AuditLogger::logTicket(
                'UPDATE',
                "Ticket #{$ticket->ticket_number} updated by {$user->name}.",
                $ticket,
                $oldValues,
                $newValues
            );
        }

        if (isset($validated['assignee_id']) && $validated['assignee_id'] != $oldAssigneeId && $validated['assignee_id']) {
            Notification::create([
                'user_id' => $validated['assignee_id'],
                'title' => 'Ticket Assignment',
                'message' => "You have been assigned to ticket {$ticket->ticket_number}",
                'type' => 'info',
                'ticket_id' => $ticket->id,
            ]);

            $newAssignee = \App\Models\User::find($validated['assignee_id']);
            if ($newAssignee) {
                defer(function () use ($ticket, $newAssignee) {
                    try {
                        EmailNotificationService::sendTicketAssigned($ticket, $newAssignee);
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::warning('Failed to dispatch assignee email: ' . $e->getMessage());
                    }
                });
            }
        }

        if (isset($validated['status']) && $validated['status'] !== $oldStatus) {
            $newStatus = $validated['status'];
            defer(function () use ($ticket, $oldStatus, $newStatus) {
                try {
                    EmailNotificationService::sendTicketStatusChanged($ticket, $oldStatus, $newStatus);
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Failed to dispatch status email: ' . $e->getMessage());
                }

                try {
                    TelegramService::sendTicketNotification($ticket, 'status_changed');
                } catch (\Exception $e) {}
            });
        }

        return response()->json($ticket);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $ticket = Ticket::find($id);
        if (!$ticket) {
            return response()->json(['error' => 'Ticket not found'], 404);
        }

        $num = $ticket->ticket_number;
        $title = $ticket->title;
        $ticket->delete();

        AuditLogger::logTicket(
            'DELETE',
            "Administrator {$user->name} permanently deleted Ticket #{$num} ('{$title}').",
            $ticket
        );

        return response()->json(['message' => 'Ticket deleted successfully']);
    }

    public function addComment(Request $request, $id)
    {
        $user = $request->user();
        $ticket = Ticket::find($id);

        if (!$ticket) {
            return response()->json(['error' => 'Ticket not found'], 404);
        }

        // IDOR Protection: Users can only comment on their own tickets
        if ($user->role === 'user' && $ticket->requester_id !== $user->id) {
            return response()->json(['error' => 'Access denied: You can only comment on your own tickets.'], 403);
        }

        $validated = $request->validate([
            'content' => 'required|string',
            'is_internal' => 'nullable|boolean',
        ]);

        $comment = TicketComment::create([
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'content' => $validated['content'],
            'is_internal' => in_array($user->role, ['admin', 'manager', 'agent']) ? ($validated['is_internal'] ?? false) : false,
        ]);

        if (in_array($user->role, ['admin', 'manager', 'agent']) && !$ticket->first_response_at) {
            $ticket->update(['first_response_at' => now()]);
        }

        // Notify requester or assignee
        if ($user->id !== $ticket->requester_id && !$comment->is_internal) {
            Notification::create([
                'user_id' => $ticket->requester_id,
                'title' => 'Ticket Update #' . $ticket->ticket_number,
                'message' => "{$user->name} added a new comment",
                'type' => 'info',
                'ticket_id' => $ticket->id,
            ]);
        }

        // Automatic Add-on dispatch: Email Comment Notification (Non-blocking)
        defer(function () use ($ticket, $comment, $user) {
            try {
                EmailNotificationService::sendTicketComment($ticket, $comment, $user);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Failed to dispatch comment email: ' . $e->getMessage());
            }
        });

        return response()->json([
            'id' => $comment->id,
            'content' => $comment->content,
            'is_internal' => $comment->is_internal,
            'created_at' => $comment->created_at->toIso8601String(),
            'user_id' => $user->id,
            'user_name' => $user->name,
            'user_role' => $user->role,
        ], 201);
    }

    public function history($id)
    {
        $ticket = Ticket::find($id);
        if (!$ticket) {
            return response()->json(['error' => 'Ticket not found'], 404);
        }

        $history = $ticket->history()->with('user')->get()->map(function ($h) {
            return [
                'id' => $h->id,
                'action' => $h->action,
                'field_name' => $h->field_name,
                'old_value' => $h->old_value,
                'new_value' => $h->new_value,
                'changed_at' => $h->created_at->toIso8601String(),
                'user_name' => $h->user?->name,
            ];
        });

        return response()->json($history);
    }

    public function rateSatisfaction(Request $request, $id)
    {
        $user = $request->user();
        $ticket = Ticket::find($id);

        if (!$ticket) {
            return response()->json(['error' => 'Ticket not found'], 404);
        }

        if ($user->role === 'user' && $ticket->requester_id !== $user->id) {
            return response()->json(['error' => 'Only the ticket requester can submit a satisfaction rating.'], 403);
        }

        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'feedback' => 'nullable|string|max:1000',
        ]);

        $ticket->update([
            'satisfaction_rating' => $validated['rating'],
            'satisfaction_feedback' => $validated['feedback'] ?? null,
            'rated_at' => now(),
        ]);

        TicketHistory::create([
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'action' => 'rated_csat',
            'new_value' => "{$validated['rating']} Stars",
        ]);

        return response()->json([
            'message' => 'Thank you for your rating and feedback!',
            'rating' => $ticket->satisfaction_rating,
            'feedback' => $ticket->satisfaction_feedback,
        ]);
    }

    public function suggestArticles(Request $request)
    {
        $q = trim($request->input('query', ''));
        if (strlen($q) < 3) {
            return response()->json(['articles' => []]);
        }

        $words = explode(' ', $q);
        $articles = \App\Models\KnowledgeArticle::where('status', 'published')
            ->where(function ($query) use ($q, $words) {
                $query->where('title', 'like', "%{$q}%")
                    ->orWhere('content', 'like', "%{$q}%");
                foreach ($words as $w) {
                    if (strlen($w) >= 3) {
                        $query->orWhere('title', 'like', "%{$w}%");
                    }
                }
            })
            ->take(4)
            ->get(['id', 'title', 'category', 'views', 'helpful_count', 'content'])
            ->map(function ($a) {
                return [
                    'id' => $a->id,
                    'title' => $a->title,
                    'snippet' => \Illuminate\Support\Str::limit(strip_tags($a->content), 120),
                    'helpful_count' => $a->helpful_count,
                ];
            });

        return response()->json(['articles' => $articles]);
    }
}
