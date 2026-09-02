<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Service Catalog Items
        Schema::create('service_catalog_items', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category')->default('General'); // Hardware, Software, Access, Network
            $table->text('description')->nullable();
            $table->string('icon')->default('📦');
            $table->integer('estimated_delivery_hours')->default(24);
            $table->boolean('requires_approval')->default(false);
            $table->boolean('is_active')->default(true);
            $table->json('form_fields')->nullable();
            $table->timestamps();
        });

        // 2. Problems Table (Problem Management & RCA)
        Schema::create('problems', function (Blueprint $table) {
            $table->id();
            $table->string('problem_number')->unique();
            $table->string('title');
            $table->text('description');
            $table->string('status')->default('logged'); // logged, investigating, known_error, solution_found, resolved, closed
            $table->string('priority')->default('medium'); // critical, high, medium, low
            $table->string('impact')->default('major'); // critical, major, minor
            $table->text('root_cause')->nullable();
            $table->text('workaround')->nullable();
            $table->text('permanent_solution')->nullable();
            $table->foreignId('owner_id')->nullable()->constrained('users')->onDelete('set null');
            $table->dateTime('resolved_at')->nullable();
            $table->timestamps();
        });

        // 3. Enhance Tickets Table (CSAT, Problem Link, Service Catalog Link)
        Schema::table('tickets', function (Blueprint $table) {
            $table->foreignId('problem_id')->nullable()->after('sla_policy_id')->constrained('problems')->onDelete('set null');
            $table->foreignId('service_catalog_id')->nullable()->after('problem_id')->constrained('service_catalog_items')->onDelete('set null');
            $table->integer('satisfaction_rating')->nullable()->after('closed_at'); // 1 to 5 stars
            $table->text('satisfaction_feedback')->nullable()->after('satisfaction_rating');
            $table->dateTime('rated_at')->nullable()->after('satisfaction_feedback');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropForeign(['problem_id']);
            $table->dropForeign(['service_catalog_id']);
            $table->dropColumn([
                'problem_id',
                'service_catalog_id',
                'satisfaction_rating',
                'satisfaction_feedback',
                'rated_at',
            ]);
        });

        Schema::dropIfExists('problems');
        Schema::dropIfExists('service_catalog_items');
    }
};
