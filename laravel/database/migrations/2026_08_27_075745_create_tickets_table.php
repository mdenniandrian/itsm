<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number')->unique();
            $table->string('title');
            $table->text('description');
            $table->string('status')->default('open'); // open, in_progress, pending, resolved, closed
            $table->string('priority')->default('medium'); // critical, high, medium, low
            $table->string('category')->default('incident'); // incident, service_request, problem, change_request
            $table->foreignId('requester_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('assignee_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('sla_policy_id')->nullable()->constrained('sla_policies')->onDelete('set null');
            $table->timestamp('sla_response_due')->nullable();
            $table->timestamp('sla_resolution_due')->nullable();
            $table->boolean('sla_response_breached')->default(false);
            $table->boolean('sla_resolution_breached')->default(false);
            $table->timestamp('first_response_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
