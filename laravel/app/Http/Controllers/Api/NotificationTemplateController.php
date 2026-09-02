<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationTemplate;
use Illuminate\Http\Request;

class NotificationTemplateController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'superadmin', 'manager'])) {
            return response()->json(['error' => 'Access denied: Only Administrators can manage notification templates.'], 403);
        }

        $templates = NotificationTemplate::orderBy('id')->get();
        return response()->json([
            'templates' => $templates,
            'available_placeholders' => [
                '{ticket_number}' => 'Ticket Number (e.g. TKT-2609-00001)',
                '{title}' => 'Ticket / Incident Title',
                '{description}' => 'Full Problem Description',
                '{status}' => 'Ticket Status (Open, In Progress, Resolved, etc.)',
                '{priority}' => 'Ticket Priority (Critical, High, Medium, Low)',
                '{category}' => 'Service Category',
                '{requester_name}' => 'Requester Full Name',
                '{requester_email}' => 'Requester Email Address',
                '{assignee_name}' => 'Assigned Technician Name',
                '{sla_due}' => 'SLA Resolution Target Deadline',
                '{comment_text}' => 'Comment / Note Body Content',
                '{author_name}' => 'Comment Author Name',
                '{recipient_name}' => 'Notification Recipient Name',
                '{portal_url}' => 'Ticket Direct URL Link',
                '{company_name}' => 'Company / Portal Brand Name',
            ],
        ]);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'superadmin', 'manager'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $template = NotificationTemplate::find($id);
        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        return response()->json($template);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'superadmin'])) {
            return response()->json(['error' => 'Access denied: Only Administrators can modify notification templates.'], 403);
        }

        $template = NotificationTemplate::find($id);
        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $validated = $request->validate([
            'email_subject' => 'required|string|max:255',
            'email_body' => 'required|string',
            'telegram_template' => 'required|string',
            'in_app_template' => 'required|string|max:500',
            'is_active' => 'sometimes|boolean',
        ]);

        $template->update($validated);

        return response()->json([
            'message' => "Template {$template->name} saved successfully.",
            'template' => $template,
        ]);
    }

    public function preview(Request $request, $id)
    {
        $template = NotificationTemplate::find($id);
        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $sampleData = [
            'ticket_number' => 'TKT-2609-00042',
            'title' => 'Office VPN Connection & Zimbra Mail Unreachable',
            'description' => "User is unable to authenticate to internal subnet and receives connection timeout when accessing corporate mail portal.",
            'status' => 'IN PROGRESS',
            'priority' => 'HIGH',
            'category' => 'Incident - Network',
            'requester_name' => 'Ahmad Denni',
            'requester_email' => 'denni@company.com',
            'assignee_name' => 'Rian (Senior IT Support)',
            'sla_due' => now()->addHours(4)->format('d M Y H:i'),
            'comment_text' => 'We are currently restarting the firewall gateway interface and inspecting bandwidth allocation.',
            'author_name' => 'Rian (Technician)',
            'recipient_name' => 'Ahmad Denni',
            'portal_url' => url('/#ticket-42'),
            'company_name' => 'ITSM Enterprise Helpdesk',
        ];

        // Allow previewing user modifications before saving
        $subjectTemplate = $request->input('email_subject') ?: $template->email_subject;
        $bodyTemplate = $request->input('email_body') ?: $template->email_body;
        $tgTemplate = $request->input('telegram_template') ?: $template->telegram_template;
        $inAppTemplate = $request->input('in_app_template') ?: $template->in_app_template;

        $renderedSubject = NotificationTemplate::render($subjectTemplate, $sampleData);
        $renderedBody = NotificationTemplate::render($bodyTemplate, $sampleData);
        $renderedTg = NotificationTemplate::render($tgTemplate, $sampleData);
        $renderedInApp = NotificationTemplate::render($inAppTemplate, $sampleData);

        return response()->json([
            'rendered_email_subject' => $renderedSubject,
            'rendered_email_body' => $renderedBody,
            'rendered_telegram' => $renderedTg,
            'rendered_in_app' => $renderedInApp,
            'sample_data' => $sampleData,
        ]);
    }

    public function reset(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'superadmin'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $template = NotificationTemplate::find($id);
        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $defaults = collect(NotificationTemplate::getDefaultTemplates())->keyBy('event_key');
        $defaultTmpl = $defaults->get($template->event_key);

        if (!$defaultTmpl) {
            return response()->json(['error' => 'Default template not found'], 404);
        }

        $template->update([
            'email_subject' => $defaultTmpl['email_subject'],
            'email_body' => $defaultTmpl['email_body'],
            'telegram_template' => $defaultTmpl['telegram_template'],
            'in_app_template' => $defaultTmpl['in_app_template'],
            'is_active' => true,
        ]);

        return response()->json([
            'message' => "Template {$template->name} reset to factory default.",
            'template' => $template,
        ]);
    }
}
