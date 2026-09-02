<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BrandingTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $regularUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'name' => 'Super Admin',
            'email' => 'admin@itsm.com',
            'role' => 'admin',
        ]);

        $this->regularUser = User::factory()->create([
            'name' => 'John Requester',
            'email' => 'user@perusahaan.com',
            'role' => 'user',
        ]);
    }

    public function test_public_can_get_branding_settings(): void
    {
        $response = $this->getJson('/api/branding');

        $response->assertStatus(200)
            ->assertJsonPath('branding.app_version', '1.0.0')
            ->assertJsonPath('branding.copyright_text', 'Made by @mdenniandrian_')
            ->assertJsonPath('branding.primary_color', '#6366f1');
    }

    public function test_admin_can_update_branding_and_theme(): void
    {
        $payload = [
            'app_name' => 'Bangden Service Desk',
            'app_subtitle' => 'Enterprise IT Operations',
            'company_name' => 'PT Bangden Digital',
            'app_version' => '1.0.0',
            'copyright_text' => 'Made by @mdenniandrian_',
            'primary_color' => '#0284c7',
            'secondary_color' => '#38bdf8',
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/branding', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('branding.app_name', 'Bangden Service Desk')
            ->assertJsonPath('branding.primary_color', '#0284c7');
    }

    public function test_regular_user_cannot_update_branding(): void
    {
        $response = $this->actingAs($this->regularUser, 'sanctum')
            ->putJson('/api/branding', [
                'app_name' => 'Hacked App',
            ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_update_branding_with_blank_app_name_and_logo_url(): void
    {
        $payload = [
            'app_name' => null,
            'app_subtitle' => 'Modern IT Operations',
            'logo_url' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
            'logo_type' => 'image_banner',
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/branding', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('branding.app_name', null)
            ->assertJsonPath('branding.logo_type', 'image_banner');
    }

    public function test_admin_can_upload_logo_image(): void
    {
        \Illuminate\Support\Facades\Storage::fake('public');
        $file = \Illuminate\Http\UploadedFile::fake()->image('custom_logo.png', 200, 60);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/branding/logo', [
                'logo' => $file,
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'logo_url', 'branding']);
        
        $this->assertStringStartsWith('data:image/png;base64,', $response->json('logo_url'));
    }

    public function test_admin_can_reset_branding(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/branding', [
                'app_name' => 'Modified Name',
                'primary_color' => '#ff0000',
            ]);

        $resetResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/branding/reset');

        $resetResponse->assertStatus(200)
            ->assertJsonPath('branding.app_name', 'ITSM Enterprise')
            ->assertJsonPath('branding.primary_color', '#6366f1');
    }
}
