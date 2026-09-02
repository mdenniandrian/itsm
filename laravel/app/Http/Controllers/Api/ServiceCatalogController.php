<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\ServiceCatalogItem;
use App\Models\SlaPolicy;
use App\Models\Ticket;
use App\Models\TicketHistory;
use App\Services\AuditLogger;
use Illuminate\Http\Request;

class ServiceCatalogController extends Controller
{
    public function index()
    {
        $items = ServiceCatalogItem::where('is_active', true)->orderBy('category')->orderBy('name')->get();
        return response()->json([
            'services' => $items,
            'total' => $items->count(),
        ]);
    }

    public function show($id)
    {
        $item = ServiceCatalogItem::find($id);
        if (!$item) {
            return response()->json(['error' => 'Service item not found'], 404);
        }
        return response()->json($item);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied: Only Administrators and Managers can create service catalog items.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'description' => 'nullable|string',
            'estimated_delivery_hours' => 'nullable|integer|min:1|max:720',
            'requires_approval' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'form_fields' => 'nullable|array',
        ]);

        $item = ServiceCatalogItem::create([
            'name' => $validated['name'],
            'category' => $validated['category'],
            'description' => $validated['description'] ?? '',
            'icon' => 'catalog',
            'estimated_delivery_hours' => $validated['estimated_delivery_hours'] ?? 24,
            'requires_approval' => $validated['requires_approval'] ?? false,
            'is_active' => $validated['is_active'] ?? true,
            'form_fields' => $validated['form_fields'] ?? [],
        ]);

        AuditLogger::log(
            'service_catalog',
            'CREATE',
            "Administrator {$user->name} created new service catalog item '{$item->name}' in category '{$item->category}'.",
            'catalog.create',
            'success',
            $user,
            $item,
            null,
            $item->toArray()
        );

        return response()->json([
            'message' => "Service catalog item '{$item->name}' created successfully.",
            'service' => $item,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied: Only Administrators and Managers can update service catalog items.'], 403);
        }

        $item = ServiceCatalogItem::find($id);
        if (!$item) {
            return response()->json(['error' => 'Service item not found'], 404);
        }

        $oldValues = $item->toArray();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category' => 'sometimes|string|max:100',
            'description' => 'nullable|string',
            'estimated_delivery_hours' => 'nullable|integer|min:1|max:720',
            'requires_approval' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'form_fields' => 'nullable|array',
        ]);

        $item->update($validated);
        $newValues = $item->toArray();

        AuditLogger::log(
            'service_catalog',
            'UPDATE',
            "Administrator {$user->name} updated service catalog item '{$item->name}'.",
            'catalog.update',
            'success',
            $user,
            $item,
            $oldValues,
            $newValues
        );

        return response()->json([
            'message' => "Service catalog item '{$item->name}' updated successfully.",
            'service' => $item,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied: Only Administrators and Managers can delete service catalog items.'], 403);
        }

        $item = ServiceCatalogItem::find($id);
        if (!$item) {
            return response()->json(['error' => 'Service item not found'], 404);
        }

        $name = $item->name;
        $category = $item->category;
        $item->delete();

        AuditLogger::log(
            'service_catalog',
            'DELETE',
            "Administrator {$user->name} permanently deleted service catalog item '{$name}' ({$category}).",
            'catalog.delete',
            'success',
            $user
        );

        return response()->json([
            'message' => "Service catalog item '{$name}' deleted successfully.",
        ]);
    }

    public function submitRequest(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'service_catalog_id' => 'required|exists:service_catalog_items,id',
            'form_data' => 'required|array',
            'notes' => 'nullable|string',
        ]);

        $service = ServiceCatalogItem::findOrFail($validated['service_catalog_id']);

        // Generate Ticket Title & Formatted Description
        $title = "Service Request: {$service->name}";

        $desc = "📋 **SERVICE REQUEST FORM ({$service->name})**\n"
              . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
              . "👤 **Requester:** {$user->name} ({$user->email} - {$user->department})\n"
              . "🕒 **Submitted At:** " . now()->format('Y-m-d H:i:s') . "\n"
              . "⏱️ **Target Delivery (SLA):** {$service->estimated_delivery_hours} Hours\n\n"
              . "📝 **Request Details:**\n";

        foreach ($validated['form_data'] as $k => $v) {
            $label = ucwords(str_replace('_', ' ', $k));
            $desc .= "- **{$label}:** {$v}\n";
        }

        if (!empty($validated['notes'])) {
            $desc .= "\n💬 **Additional Notes:**\n{$validated['notes']}\n";
        }

        $sla = SlaPolicy::where('priority', 'medium')->where('is_active', true)->first();
        $responseDue = now()->addHours(8);
        $resolutionDue = now()->addHours($service->estimated_delivery_hours ?: 24);

        $datePrefix = 'SRQ-' . date('ym') . '-';
        $count = Ticket::where('ticket_number', 'like', "{$datePrefix}%")->count() + 1;
        $ticketNumber = $datePrefix . str_pad($count, 5, '0', STR_PAD_LEFT);

        $ticket = Ticket::create([
            'ticket_number' => $ticketNumber,
            'title' => $title,
            'description' => $desc,
            'status' => 'open',
            'priority' => 'medium',
            'category' => 'service_request',
            'requester_id' => $user->id,
            'service_catalog_id' => $service->id,
            'sla_policy_id' => $sla?->id,
            'sla_response_due' => $responseDue,
            'sla_resolution_due' => $resolutionDue,
        ]);

        TicketHistory::create([
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'action' => 'created_from_service_catalog',
        ]);

        // Trigger Telegram if active
        try {
            \App\Services\TelegramService::sendTicketNotification($ticket, 'created');
        } catch (\Exception $e) {}

        return response()->json([
            'message' => 'Service request submitted successfully and ticket created!',
            'ticket' => $ticket,
        ], 201);
    }
}
