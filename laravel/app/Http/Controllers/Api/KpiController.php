<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KpiController extends Controller
{
    public function summary(Request $request)
    {
        $tickets = Ticket::all();
        $totalTickets = $tickets->count();
        $resolvedTickets = $tickets->whereIn('status', ['resolved', 'closed']);
        $totalResolved = $resolvedTickets->count();

        // 1. MTTR (Mean Time to Resolution) in hours
        $resolutionDurations = [];
        foreach ($resolvedTickets as $t) {
            if ($t->resolved_at && $t->created_at) {
                $resolutionDurations[] = $t->created_at->diffInMinutes($t->resolved_at) / 60.0;
            }
        }
        $avgMttrHours = count($resolutionDurations) > 0 ? round(array_sum($resolutionDurations) / count($resolutionDurations), 2) : 0;

        // 2. MTTA (Mean Time to Acknowledge / First Response) in minutes
        $responseDurations = [];
        foreach ($tickets as $t) {
            if ($t->first_response_at && $t->created_at) {
                $responseDurations[] = $t->created_at->diffInMinutes($t->first_response_at);
            }
        }
        $avgMttaMinutes = count($responseDurations) > 0 ? round(array_sum($responseDurations) / count($responseDurations), 1) : 0;

        // 3. SLA Compliance Rate (%)
        $slaEligible = $tickets->whereNotNull('sla_policy_id');
        $slaBreachedCount = $slaEligible->where('sla_resolution_breached', true)->count();
        $slaTotal = $slaEligible->count();
        $slaComplianceRate = $slaTotal > 0 ? round((($slaTotal - $slaBreachedCount) / $slaTotal) * 100, 1) : 100.0;

        // 4. First Contact Resolution (FCR) Rate (%)
        // Tickets resolved with exactly 1 public comment or within first 2 hours
        $fcrCount = 0;
        foreach ($resolvedTickets as $t) {
            $commentCount = $t->comments()->where('is_internal', false)->count();
            if ($commentCount <= 2 && $t->resolved_at && $t->created_at && $t->created_at->diffInHours($t->resolved_at) <= 4) {
                $fcrCount++;
            }
        }
        $fcrRate = $totalResolved > 0 ? round(($fcrCount / $totalResolved) * 100, 1) : 100.0;

        // 5. Backlog & Active Tickets
        $activeTicketsCount = $tickets->whereIn('status', ['open', 'in_progress', 'pending'])->count();
        $criticalTicketsCount = $tickets->where('priority', 'critical')->whereIn('status', ['open', 'in_progress', 'pending'])->count();

        // 6. CSAT (Customer Satisfaction Score)
        $ratedTickets = $tickets->whereNotNull('satisfaction_rating');
        $csatCount = $ratedTickets->count();
        $avgCsat = $csatCount > 0 ? round($ratedTickets->avg('satisfaction_rating'), 2) : 5.0;
        $csatPercent = round(($avgCsat / 5.0) * 100, 1);

        // 7. Overall Performance Grade
        $grade = 'A';
        if ($slaComplianceRate < 80 || $avgMttrHours > 24 || $avgCsat < 3.5) {
            $grade = 'C';
        } elseif ($slaComplianceRate < 90 || $avgMttrHours > 12 || $avgCsat < 4.2) {
            $grade = 'B';
        }

        return response()->json([
            'total_tickets' => $totalTickets,
            'resolved_tickets' => $totalResolved,
            'active_tickets' => $activeTicketsCount,
            'critical_tickets' => $criticalTicketsCount,
            'mttr_hours' => $avgMttrHours,
            'mttr_formatted' => $this->formatHoursToReadable($avgMttrHours),
            'mtta_minutes' => $avgMttaMinutes,
            'mtta_formatted' => $this->formatMinutesToReadable($avgMttaMinutes),
            'sla_compliance_rate' => $slaComplianceRate,
            'sla_breached_count' => $slaBreachedCount,
            'fcr_rate' => $fcrRate,
            'fcr_count' => $fcrCount,
            'csat_average' => $avgCsat,
            'csat_percentage' => $csatPercent,
            'csat_total_reviews' => $csatCount,
            'performance_grade' => $grade,
            'target_sla' => 95.0,
            'target_mttr_hours' => 8.0,
            'target_mtta_minutes' => 30.0,
            'target_csat' => 4.5,
        ]);
    }

    public function trends(Request $request)
    {
        $days = min(60, max(7, (int) ($request->days ?? 14)));
        $data = [];

        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $start = $date->copy()->startOfDay();
            $end = $date->copy()->endOfDay();
            $dateStr = $date->format('Y-m-d');
            $dateLabel = $date->translatedFormat('d M');

            $dayResolved = Ticket::whereBetween('resolved_at', [$start, $end])->get();
            $dayCreated = Ticket::whereBetween('created_at', [$start, $end])->get();

            $mttrValues = [];
            foreach ($dayResolved as $t) {
                if ($t->created_at && $t->resolved_at) {
                    $mttrValues[] = $t->created_at->diffInMinutes($t->resolved_at) / 60.0;
                }
            }
            $dayMttr = count($mttrValues) > 0 ? round(array_sum($mttrValues) / count($mttrValues), 1) : null;

            $slaTotal = $dayResolved->count();
            $slaBreached = $dayResolved->where('sla_resolution_breached', true)->count();
            $daySla = $slaTotal > 0 ? round((($slaTotal - $slaBreached) / $slaTotal) * 100, 1) : 100;

            $data[] = [
                'date' => $dateStr,
                'label' => $dateLabel,
                'created' => $dayCreated->count(),
                'resolved' => $dayResolved->count(),
                'mttr_hours' => $dayMttr ?? 0,
                'sla_rate' => $daySla,
            ];
        }

        return response()->json($data);
    }

    public function agents()
    {
        $agents = User::whereIn('role', ['admin', 'manager', 'agent'])
            ->where('is_active', true)
            ->get();

        $scorecard = $agents->map(function ($agent) {
            $assigned = Ticket::where('assignee_id', $agent->id)->get();
            $resolved = $assigned->whereIn('status', ['resolved', 'closed']);
            $active = $assigned->whereIn('status', ['open', 'in_progress', 'pending']);

            // MTTR for this agent
            $mttrHours = [];
            foreach ($resolved as $t) {
                if ($t->resolved_at && $t->created_at) {
                    $mttrHours[] = $t->created_at->diffInMinutes($t->resolved_at) / 60.0;
                }
            }
            $avgMttr = count($mttrHours) > 0 ? round(array_sum($mttrHours) / count($mttrHours), 1) : null;

            // MTTA for this agent
            $mttaMins = [];
            foreach ($assigned as $t) {
                if ($t->first_response_at && $t->created_at) {
                    $mttaMins[] = $t->created_at->diffInMinutes($t->first_response_at);
                }
            }
            $avgMtta = count($mttaMins) > 0 ? round(array_sum($mttaMins) / count($mttaMins), 1) : null;

            // SLA Compliance for this agent
            $slaCount = $assigned->count();
            $slaBreached = $assigned->where('sla_resolution_breached', true)->count();
            $slaRate = $slaCount > 0 ? round((($slaCount - $slaBreached) / $slaCount) * 100, 1) : 100.0;

            // Composite Performance Score (0-100)
            $score = 80;
            if ($slaRate >= 95) $score += 10;
            elseif ($slaRate < 80) $score -= 15;

            if ($avgMttr !== null && $avgMttr <= 4) $score += 10;
            elseif ($avgMttr > 12) $score -= 10;

            $score = min(100, max(40, $score));

            return [
                'id' => $agent->id,
                'name' => $agent->name,
                'email' => $agent->email,
                'role' => $agent->role,
                'department' => $agent->department,
                'total_assigned' => $assigned->count(),
                'resolved_count' => $resolved->count(),
                'active_count' => $active->count(),
                'mttr_hours' => $avgMttr,
                'mtta_minutes' => $avgMtta,
                'sla_compliance_rate' => $slaRate,
                'performance_score' => $score,
            ];
        })->sortByDesc('performance_score')->values();

        return response()->json($scorecard);
    }

    public function departments()
    {
        $users = User::all();
        $departments = $users->pluck('department')->filter()->unique()->values();

        $result = $departments->map(function ($dept) {
            $userGroup = User::where('department', $dept)->pluck('id');
            $deptTickets = Ticket::whereIn('requester_id', $userGroup)->get();
            $resolved = $deptTickets->whereIn('status', ['resolved', 'closed']);

            $mttrList = [];
            foreach ($resolved as $t) {
                if ($t->resolved_at && $t->created_at) {
                    $mttrList[] = $t->created_at->diffInMinutes($t->resolved_at) / 60.0;
                }
            }

            return [
                'department' => $dept,
                'total_tickets' => $deptTickets->count(),
                'active_tickets' => $deptTickets->whereIn('status', ['open', 'in_progress', 'pending'])->count(),
                'resolved_tickets' => $resolved->count(),
                'avg_mttr_hours' => count($mttrList) > 0 ? round(array_sum($mttrList) / count($mttrList), 1) : 0,
            ];
        })->sortByDesc('total_tickets')->values();

        return response()->json($result);
    }

    private function formatHoursToReadable($hours): string
    {
        if ($hours <= 0) return '0 min';
        if ($hours < 1) {
            $mins = (int) round($hours * 60);
            return $mins <= 1 ? "{$mins} min" : "{$mins} mins";
        }
        $h = (int) floor($hours);
        $m = (int) round(($hours - $h) * 60);
        return $m > 0 ? "{$h}h {$m}m" : ($h <= 1 ? "{$h} hour" : "{$h} hours");
    }

    private function formatMinutesToReadable($minutes): string
    {
        if ($minutes <= 0) return '0 min';
        if ($minutes < 60) {
            $m = (int) round($minutes);
            return $m <= 1 ? "{$m} min" : "{$m} mins";
        }
        $h = (int) floor($minutes / 60);
        $m = (int) round($minutes % 60);
        return $m > 0 ? "{$h}h {$m}m" : ($h <= 1 ? "{$h} hour" : "{$h} hours");
    }
}
