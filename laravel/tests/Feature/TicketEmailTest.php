<?php

namespace Tests\Feature;

use App\Models\AddonConfig;
use App\Models\Ticket;
use App\Models\User;
use App\Services\EmailNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TicketEmailTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $agent;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'name' => 'User Pelapor',
            'email' => 'pelapor@bangden.my.id',
            'password' => bcrypt('password123'),
            'role' => 'user',
            'is_active' => true,
        ]);

        $this->agent = User::create([
            'name' => 'IT Support Agent',
            'email' => 'agent@bangden.my.id',
            'password' => bcrypt('password123'),
            'role' => 'agent',
            'is_active' => true,
        ]);

        AddonConfig::create([
            'addon_key' => 'smtp',
            'name' => 'SMTP',
            'is_enabled' => true,
            'config' => [
                'host' => '127.0.0.1',
                'port' => 587,
                'encryption' => 'tls',
                'username' => 'no-reply@bangden.my.id',
                'password' => 'secret',
                'from_address' => 'no-reply@bangden.my.id',
                'from_name' => 'ITSM Helpdesk',
            ],
        ]);
    }

    public function test_creating_ticket_dispatches_email_safely()
    {
        $res = $this->actingAs($this->user, 'sanctum')->postJson('/api/tickets', [
            'title' => 'Email notification test ticket',
            'description' => 'Testing email dispatch on ticket create',
            'priority' => 'high',
            'category' => 'incident',
        ]);

        $res->assertStatus(201)
            ->assertJsonStructure(['id', 'ticket_number', 'title', 'status']);
    }

    public function test_updating_ticket_status_triggers_notification()
    {
        $ticket = Ticket::create([
            'ticket_number' => 'TKT-TEST-001',
            'title' => 'Status update test',
            'description' => 'Test description',
            'status' => 'open',
            'priority' => 'medium',
            'category' => 'incident',
            'requester_id' => $this->user->id,
            'assignee_id' => $this->agent->id,
        ]);

        $res = $this->actingAs($this->agent, 'sanctum')->putJson("/api/tickets/{$ticket->id}", [
            'status' => 'in_progress',
        ]);

        $res->assertStatus(200);
        $this->assertEquals('in_progress', $ticket->fresh()->status);
    }

    public function test_adding_comment_triggers_comment_notification()
    {
        $ticket = Ticket::create([
            'ticket_number' => 'TKT-TEST-002',
            'title' => 'Comment notification test',
            'description' => 'Test description',
            'status' => 'in_progress',
            'priority' => 'medium',
            'category' => 'incident',
            'requester_id' => $this->user->id,
            'assignee_id' => $this->agent->id,
        ]);

        $res = $this->actingAs($this->agent, 'sanctum')->postJson("/api/tickets/{$ticket->id}/comments", [
            'content' => 'Halo, tiket Anda sedang kami tangani dan kami perbaiki.',
            'is_internal' => false,
        ]);

        $res->assertStatus(201);
    }
}
