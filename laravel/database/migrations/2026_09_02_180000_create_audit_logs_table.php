<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_name')->nullable();
            $table->string('user_email')->nullable();
            $table->string('user_role')->nullable();
            $table->string('event_type')->index();
            $table->string('category')->index(); // auth, security, ticket, problem, change, service_catalog, system
            $table->string('action'); // LOGIN, FAILED_LOGIN, LOGOUT, CREATE, UPDATE, DELETE, STATUS_CHANGE, CONFIG_CHANGE
            $table->string('status')->default('success')->index(); // success, failed, warning
            $table->text('description');
            $table->string('ip_address', 45)->nullable()->index();
            $table->text('user_agent')->nullable();
            $table->string('device')->nullable();
            $table->string('browser')->nullable();
            $table->nullableMorphs('auditable'); // auditable_type, auditable_id
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->timestamps();

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
