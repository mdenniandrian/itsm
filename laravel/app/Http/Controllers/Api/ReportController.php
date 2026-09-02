<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function exportTicketsCsv(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $query = Ticket::with(['requester', 'assignee', 'slaPolicy', 'serviceCatalog', 'problem']);

        // End users can only export their own tickets
        if ($user->role === 'user') {
            $query->where('requester_id', $user->id);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('priority') && $request->priority !== 'all') {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        $tickets = $query->orderBy('created_at', 'desc')->get();

        $filename = 'ITSM_Tickets_Report_' . date('Ymd_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($tickets) {
            $file = fopen('php://output', 'w');
            // Write UTF-8 BOM for Excel compatibility
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));

            // CSV Header Row
            fputcsv($file, [
                'No Tiket',
                'Judul Tiket',
                'Kategori',
                'Prioritas',
                'Status',
                'Pemohon (User)',
                'Email Pemohon',
                'Departemen',
                'Teknisi (Assignee)',
                'Kebijakan SLA',
                'SLA Response Breached',
                'SLA Resolution Breached',
                'Skor CSAT (1-5)',
                'Ulasan Kepuasan User',
                'Tanggal Dibuat',
                'Tanggal Respons Pertama',
                'Tanggal Selesai',
            ]);

            foreach ($tickets as $t) {
                fputcsv($file, [
                    $t->ticket_number,
                    $t->title,
                    $t->category,
                    $t->priority,
                    $t->status,
                    $t->requester?->name ?: '-',
                    $t->requester?->email ?: '-',
                    $t->requester?->department ?: '-',
                    $t->assignee?->name ?: 'Belum Ditugaskan',
                    $t->slaPolicy?->name ?: 'Default SLA',
                    $t->sla_response_breached ? 'Ya (Terlambat)' : 'Tidak',
                    $t->sla_resolution_breached ? 'Ya (Terlambat)' : 'Tidak',
                    $t->satisfaction_rating ? "{$t->satisfaction_rating} Bintang" : '-',
                    $t->satisfaction_feedback ?: '-',
                    $t->created_at->format('Y-m-d H:i:s'),
                    $t->first_response_at ? $t->first_response_at->format('Y-m-d H:i:s') : '-',
                    $t->resolved_at ? $t->resolved_at->format('Y-m-d H:i:s') : '-',
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function exportKpiSummary(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'agent', 'superadmin'])) {
            return response()->json(['error' => 'Akses ditolak: Hanya IT Staff dan Manajemen yang dapat mengekspor ringkasan KPI'], 403);
        }
        $allTickets = Ticket::all();
        $total = $allTickets->count();
        $resolved = $allTickets->whereIn('status', ['resolved', 'closed']);
        $resolvedCount = $resolved->count();

        // SLA %
        $breached = $resolved->where('sla_resolution_breached', true)->count();
        $slaRate = $resolvedCount > 0 ? round((($resolvedCount - $breached) / $resolvedCount) * 100, 1) : 100.0;

        // CSAT Avg
        $rated = $allTickets->whereNotNull('satisfaction_rating');
        $csatAvg = $rated->count() > 0 ? round($rated->avg('satisfaction_rating'), 2) : 5.0;

        $filename = 'ITSM_KPI_Executive_Summary_' . date('Ymd_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($total, $resolvedCount, $slaRate, $csatAvg, $rated) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($file, ['METRIK KPI EKSEKUTIF ITSM', 'NILAI PENCAPAIAN']);
            fputcsv($file, ['Total Inbound Tickets', $total]);
            fputcsv($file, ['Total Resolved Tickets', $resolvedCount]);
            fputcsv($file, ['SLA Resolution Compliance Rate (%)', "{$slaRate}%"]);
            fputcsv($file, ['Average CSAT Satisfaction Score (1-5)', "{$csatAvg} / 5.0"]);
            fputcsv($file, ['Total CSAT Surveys Received', $rated->count()]);
            fputcsv($file, ['Report Export Timestamp', now()->format('Y-m-d H:i:s') . ' UTC']);

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
