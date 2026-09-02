<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Notification::with('ticket')->where('user_id', $user->id);

        if ($request->filled('unread_only') && filter_var($request->unread_only, FILTER_VALIDATE_BOOLEAN)) {
            $query->where('is_read', false);
        }

        $limit = max(1, min((int) ($request->limit ?? 20), 50));
        $notifications = $query->orderBy('created_at', 'desc')->take($limit)->get();

        $unreadCount = Notification::where('user_id', $user->id)->where('is_read', false)->count();

        $formatted = $notifications->map(function ($n) {
            return [
                'id' => $n->id,
                'title' => $n->title,
                'message' => $n->message,
                'type' => $n->type,
                'ticket_id' => $n->ticket_id,
                'ticket_number' => $n->ticket?->ticket_number,
                'is_read' => (bool) $n->is_read,
                'created_at' => $n->created_at->toIso8601String(),
            ];
        });

        return response()->json([
            'notifications' => $formatted,
            'unread_count' => $unreadCount,
        ]);
    }

    public function markRead(Request $request, $id)
    {
        $user = $request->user();
        $notification = Notification::where('id', $id)->where('user_id', $user->id)->first();

        if ($notification) {
            $notification->update(['is_read' => true]);
        }

        return response()->json(['message' => 'Notification marked as read']);
    }

    public function markAllRead(Request $request)
    {
        $user = $request->user();
        Notification::where('user_id', $user->id)->update(['is_read' => true]);

        return response()->json(['message' => 'All notifications marked as read']);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        Notification::where('id', $id)->where('user_id', $user->id)->delete();

        return response()->json(['message' => 'Notification deleted successfully']);
    }
}
