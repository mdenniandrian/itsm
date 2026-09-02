<?php

namespace Tests\Feature;

use App\Models\NotificationTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTemplateTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $regularUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'email' => 'admin@bangden.my.id',
            'role' => 'admin',
        ]);

        $this->regularUser = User::factory()->create([
            'email' => 'user@bangden.my.id',
            'role' => 'user',
        ]);

        $this->seed(\Database\Seeders\NotificationTemplateSeeder::class);
    }

    public function test_admin_can_list_notification_templates(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/notification-templates');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'templates',
                'available_placeholders',
            ]);

        $this->assertGreaterThanOrEqual(5, count($response->json('templates')));
    }

    public function test_regular_user_cannot_access_templates(): void
    {
        $response = $this->actingAs($this->regularUser, 'sanctum')
            ->getJson('/api/notification-templates');

        $response->assertStatus(403);
    }

    public function test_admin_can_preview_template_rendering(): void
    {
        $template = NotificationTemplate::where('event_key', 'ticket_created_requester')->first();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/notification-templates/{$template->id}/preview", [
                'email_subject' => 'Custom Subject #{ticket_number}',
                'email_body' => '<p>Halo {requester_name}, status tiketmu adalah {status}</p>',
                'telegram_template' => '<b>Tiket #{ticket_number}</b>',
                'in_app_template' => 'Tiket #{ticket_number}',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('rendered_email_subject', 'Custom Subject #TKT-2609-00042')
            ->assertJsonPath('rendered_telegram', '<b>Tiket #TKT-2609-00042</b>');
    }

    public function test_admin_can_update_and_reset_template(): void
    {
        $template = NotificationTemplate::where('event_key', 'ticket_assigned')->first();

        $updateResponse = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/notification-templates/{$template->id}", [
                'email_subject' => 'Tugas Baru #{ticket_number}',
                'email_body' => '<p>Halo {assignee_name}</p>',
                'telegram_template' => 'Telegram #{ticket_number}',
                'in_app_template' => 'InApp #{ticket_number}',
            ]);

        $updateResponse->assertStatus(200);
        $this->assertEquals('Tugas Baru #{ticket_number}', $template->fresh()->email_subject);

        // Reset
        $resetResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/notification-templates/{$template->id}/reset");

        $resetResponse->assertStatus(200);
        $this->assertStringContainsString('[Ticket Assignment]', $template->fresh()->email_subject);
    }
}
