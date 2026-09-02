<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditLogController extends Controller
{
    /**
     * List paginated audit logs with search and multi-filtering.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied: Audit logs are restricted to Administrators and Managers.'], 403);
        }

        $query = AuditLog::query()->orderBy('created_at', 'desc');

        // Filter by category
        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        // Filter by action
        if ($request->filled('action') && $request->action !== 'all') {
            $query->where('action', strtoupper($request->action));
        }

        // Filter by status
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by user ID
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by date range
        if ($request->filled('from_date')) {
            $query->where('created_at', '>=', $request->from_date . ' 00:00:00');
        }
        if ($request->filled('to_date')) {
            $query->where('created_at', '<=', $request->to_date . ' 23:59:59');
        }

        // Fulltext search
        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('user_name', 'like', "%{$search}%")
                  ->orWhere('user_email', 'like', "%{$search}%")
                  ->orWhere('ip_address', 'like', "%{$search}%")
                  ->orWhere('action', 'like', "%{$search}%")
                  ->orWhere('event_type', 'like', "%{$search}%");
            });
        }

        $perPage = min(100, max(10, (int) ($request->per_page ?? 25)));
        $logs = $query->paginate($perPage);

        return response()->json($logs);
    }

    /**
     * Get summary KPI stats for Audit Dashboard.
     */
    public function stats(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        $today = now()->startOfDay();
        $yesterday = now()->subHours(24);

        $total = AuditLog::count();
        $loginsToday = AuditLog::where('category', 'auth')
            ->where('action', 'LOGIN')
            ->where('status', 'success')
            ->where('created_at', '>=', $today)
            ->count();

        $failedLogins24h = AuditLog::where('category', 'auth')
            ->where('action', 'FAILED_LOGIN')
            ->where('created_at', '>=', $yesterday)
            ->count();

        $configChanges = AuditLog::whereIn('category', ['system', 'security', 'service_catalog'])
            ->whereIn('action', ['UPDATE', 'CONFIG_CHANGE', 'DELETE'])
            ->count();

        return response()->json([
            'total_events' => $total,
            'logins_today' => $loginsToday,
            'failed_logins_24h' => $failedLogins24h,
            'config_changes' => $configChanges,
        ]);
    }

    /**
     * Get single audit log record with detailed metadata.
     */
    public function show(Request $request, int $id)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        $log = AuditLog::with('user')->find($id);
        if (!$log) {
            return response()->json(['error' => 'Audit log record not found.'], 404);
        }

        return response()->json(['log' => $log]);
    }

    /**
     * Export filtered audit logs as downloadable CSV.
     */
    public function export(Request $request): StreamedResponse
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'superadmin'])) {
            abort(403, 'Access denied.');
        }

        $query = AuditLog::query()->orderBy('created_at', 'desc');

        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->filled('from_date')) {
            $query->where('created_at', '>=', $request->from_date . ' 00:00:00');
        }
        if ($request->filled('to_date')) {
            $query->where('created_at', '<=', $request->to_date . ' 23:59:59');
        }
        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('user_name', 'like', "%{$search}%")
                  ->orWhere('user_email', 'like', "%{$search}%")
                  ->orWhere('ip_address', 'like', "%{$search}%")
                  ->orWhere('action', 'like', "%{$search}%");
            });
        }

        $fileName = 'itsm_audit_logs_' . date('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($query) {
            $handle = fopen('php://output', 'w');
            
            // UTF-8 BOM for Excel compatibility
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($handle, [
                'Log ID',
                'Timestamp',
                'User Name',
                'User Email',
                'User Role',
                'Category',
                'Action',
                'Status',
                'Description',
                'IP Address',
                'Device / OS',
                'Browser',
                'Auditable Type',
                'Auditable ID',
            ]);

            $query->chunk(500, function ($logs) use ($handle) {
                foreach ($logs as $log) {
                    fputcsv($handle, [
                        $log->id,
                        $log->created_at->toDateTimeString(),
                        $log->user_name ?? 'System',
                        $log->user_email ?? '-',
                        $log->user_role ?? 'guest',
                        $log->category,
                        $log->action,
                        $log->status,
                        $log->description,
                        $log->ip_address ?? '-',
                        $log->device ?? '-',
                        $log->browser ?? '-',
                        $log->auditable_type ?? '-',
                        $log->auditable_id ?? '-',
                    ]);
                }
            });

            fclose($handle);
        }, $fileName, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
        ]);
    }
}
