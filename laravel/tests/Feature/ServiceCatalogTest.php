<?php

namespace Tests\Feature;

use App\Models\ServiceCatalogItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceCatalogTest extends TestCase
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
    }

    public function test_anyone_authenticated_can_view_active_catalog(): void
    {
        ServiceCatalogItem::create([
            'name' => 'MacBook M3 Pro Request',
            'category' => 'Hardware & Equipment',
            'estimated_delivery_hours' => 48,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->regularUser, 'sanctum')
            ->getJson('/api/services/catalog');

        $response->assertStatus(200)
            ->assertJsonStructure(['services', 'total']);

        $this->assertCount(1, $response->json('services'));
    }

    public function test_admin_can_create_catalog_item(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/services/catalog', [
                'name' => 'Cloud VPS Server Provisioning',
                'category' => 'Network & Infrastructure',
                'description' => 'Deploy high-performance Linux VPS instance for development.',
                'estimated_delivery_hours' => 12,
                'requires_approval' => true,
                'is_active' => true,
                'form_fields' => [
                    [
                        'name' => 'os_flavor',
                        'label' => 'Operating System',
                        'type' => 'select',
                        'required' => true,
                        'options' => ['Ubuntu 24.04', 'Debian 12', 'Rocky Linux 9'],
                    ],
                    [
                        'name' => 'vps_ram',
                        'label' => 'RAM Capacity (GB)',
                        'type' => 'number',
                        'required' => true,
                        'placeholder' => 'e.g. 16',
                    ],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('service.name', 'Cloud VPS Server Provisioning')
            ->assertJsonPath('service.category', 'Network & Infrastructure');

        $this->assertDatabaseHas('service_catalog_items', [
            'name' => 'Cloud VPS Server Provisioning',
            'category' => 'Network & Infrastructure',
            'requires_approval' => true,
        ]);
    }

    public function test_admin_can_update_catalog_item(): void
    {
        $item = ServiceCatalogItem::create([
            'name' => 'Old Service Name',
            'category' => 'Hardware & Equipment',
            'estimated_delivery_hours' => 24,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/services/catalog/{$item->id}", [
                'name' => 'Updated Service Name',
                'estimated_delivery_hours' => 48,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('service.name', 'Updated Service Name');

        $this->assertEquals(48, $item->fresh()->estimated_delivery_hours);
    }

    public function test_admin_can_delete_catalog_item(): void
    {
        $item = ServiceCatalogItem::create([
            'name' => 'Temporary Service',
            'category' => 'General Services',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/services/catalog/{$item->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('service_catalog_items', ['id' => $item->id]);
    }

    public function test_regular_user_cannot_create_or_modify_catalog(): void
    {
        $createResponse = $this->actingAs($this->regularUser, 'sanctum')
            ->postJson('/api/services/catalog', [
                'name' => 'Unauthorized Item',
                'category' => 'Hardware & Equipment',
            ]);
        $createResponse->assertStatus(403);

        $item = ServiceCatalogItem::create([
            'name' => 'Existing Item',
            'category' => 'Hardware & Equipment',
        ]);

        $updateResponse = $this->actingAs($this->regularUser, 'sanctum')
            ->putJson("/api/services/catalog/{$item->id}", ['name' => 'Hacked Item']);
        $updateResponse->assertStatus(403);

        $deleteResponse = $this->actingAs($this->regularUser, 'sanctum')
            ->deleteJson("/api/services/catalog/{$item->id}");
        $deleteResponse->assertStatus(403);
    }
}
