<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Request as RequestFacade;

class AuditLogger
{
    /**
     * Record an audit log entry.
     */
    public static function log(
        string $category,
        string $action,
        string $description,
        string $eventType = '',
        string $status = 'success',
        ?User $user = null,
        ?Model $auditable = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?Request $request = null
    ): AuditLog {
        $req = $request ?? RequestFacade::instance();

        // If user not explicitly passed, get from request user
        $currentUser = $user ?? $req->user();

        $ip = $req ? $req->ip() : '127.0.0.1';
        $ua = $req ? $req->userAgent() : null;

        $device = self::parseDevice($ua);
        $browser = self::parseBrowser($ua);

        if (empty($eventType)) {
            $eventType = strtolower("{$category}.{$action}");
        }

        // Sanitize sensitive fields in old/new values (e.g. passwords, tokens)
        $cleanOld = self::sanitizeValues($oldValues);
        $cleanNew = self::sanitizeValues($newValues);

        return AuditLog::create([
            'user_id' => $currentUser?->id,
            'user_name' => $currentUser?->name ?? 'System / Anonymous',
            'user_email' => $currentUser?->email,
            'user_role' => $currentUser?->role ?? 'guest',
            'event_type' => $eventType,
            'category' => $category,
            'action' => strtoupper($action),
            'status' => $status,
            'description' => $description,
            'ip_address' => $ip,
            'user_agent' => $ua,
            'device' => $device,
            'browser' => $browser,
            'auditable_type' => $auditable ? get_class($auditable) : null,
            'auditable_id' => $auditable?->getKey(),
            'old_values' => $cleanOld,
            'new_values' => $cleanNew,
        ]);
    }

    /**
     * Quick helper for authentication logs
     */
    public static function logAuth(string $action, string $description, string $status = 'success', ?User $user = null, ?Request $request = null, ?array $details = null): AuditLog
    {
        return self::log(
            category: 'auth',
            action: $action,
            description: $description,
            eventType: 'auth.' . strtolower($action),
            status: $status,
            user: $user,
            auditable: $user,
            newValues: $details,
            request: $request
        );
    }

    /**
     * Quick helper for security / user management logs
     */
    public static function logSecurity(string $action, string $description, ?User $targetUser = null, ?array $oldValues = null, ?array $newValues = null): AuditLog
    {
        return self::log(
            category: 'security',
            action: $action,
            description: $description,
            eventType: 'security.' . strtolower($action),
            status: 'success',
            auditable: $targetUser,
            oldValues: $oldValues,
            newValues: $newValues
        );
    }

    /**
     * Quick helper for ticket lifecycle logs
     */
    public static function logTicket(string $action, string $description, Model $ticket, ?array $oldValues = null, ?array $newValues = null): AuditLog
    {
        return self::log(
            category: 'ticket',
            action: $action,
            description: $description,
            eventType: 'ticket.' . strtolower($action),
            status: 'success',
            auditable: $ticket,
            oldValues: $oldValues,
            newValues: $newValues
        );
    }

    /**
     * Quick helper for system / brand / integration settings logs
     */
    public static function logSystem(string $action, string $description, ?array $oldValues = null, ?array $newValues = null): AuditLog
    {
        return self::log(
            category: 'system',
            action: $action,
            description: $description,
            eventType: 'system.' . strtolower($action),
            status: 'success',
            oldValues: $oldValues,
            newValues: $newValues
        );
    }

    /**
     * Parse operating system from User Agent
     */
    private static function parseDevice(?string $ua): string
    {
        if (empty($ua)) return 'Unknown';
        if (stripos($ua, 'Macintosh') !== false || stripos($ua, 'Mac OS X') !== false) return 'macOS';
        if (stripos($ua, 'Windows') !== false) return 'Windows';
        if (stripos($ua, 'Linux') !== false) return 'Linux';
        if (stripos($ua, 'Android') !== false) return 'Android';
        if (stripos($ua, 'iPhone') !== false || stripos($ua, 'iPad') !== false) return 'iOS';
        return 'Other Device';
    }

    /**
     * Parse browser name from User Agent
     */
    private static function parseBrowser(?string $ua): string
    {
        if (empty($ua)) return 'Unknown';
        if (stripos($ua, 'Edg/') !== false) return 'Edge';
        if (stripos($ua, 'Chrome/') !== false && stripos($ua, 'Chromium') === false) return 'Chrome';
        if (stripos($ua, 'Firefox/') !== false) return 'Firefox';
        if (stripos($ua, 'Safari/') !== false && stripos($ua, 'Chrome/') === false) return 'Safari';
        if (stripos($ua, 'Opera') !== false || stripos($ua, 'OPR/') !== false) return 'Opera';
        return 'Web Client';
    }

    /**
     * Filter out passwords, secrets, and auth tokens from stored JSON
     */
    private static function sanitizeValues(?array $values): ?array
    {
        if ($values === null) return null;

        $sensitive = ['password', 'password_confirmation', 'token', 'secret', 'bot_token', 'chat_id', 'smtp_password'];
        $clean = [];

        foreach ($values as $k => $v) {
            if (in_array(strtolower($k), $sensitive, true)) {
                $clean[$k] = '********';
            } elseif (is_array($v)) {
                $clean[$k] = self::sanitizeValues($v);
            } else {
                $clean[$k] = $v;
            }
        }

        return $clean;
    }
}
