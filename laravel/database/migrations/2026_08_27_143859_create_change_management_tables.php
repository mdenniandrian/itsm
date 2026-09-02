<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('change_requests', function (Blueprint $table) {
            $table->id();
            $table->string('change_number')->unique();
            $table->string('title');
            $table->text('description');
            $table->string('change_type')->default('normal'); // standard, normal, emergency
            $table->string('impact')->default('medium'); // low, medium, high
            $table->string('risk_level')->default('medium'); // low, medium, high, critical
            $table->string('priority')->default('medium'); // low, medium, high, critical
            $table->string('status')->default('draft'); // draft, submitted, pending_approval, approved, rejected, scheduled, implementing, review, closed, cancelled
            $table->foreignId('requester_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->text('implementation_plan')->nullable();
            $table->text('rollback_plan')->nullable();
            $table->text('test_plan')->nullable();
            $table->dateTime('scheduled_start_at')->nullable();
            $table->dateTime('scheduled_end_at')->nullable();
            $table->dateTime('actual_start_at')->nullable();
            $table->dateTime('actual_end_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamps();
        });

        Schema::create('change_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('change_request_id')->constrained('change_requests')->onDelete('cascade');
            $table->foreignId('approver_id')->constrained('users')->onDelete('cascade');
            $table->string('stage')->default('CAB Review'); // CAB Review, IT Manager, Security Officer, Director
            $table->string('status')->default('pending'); // pending, approved, rejected
            $table->text('comments')->nullable();
            $table->dateTime('decided_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('change_approvals');
        Schema::dropIfExists('change_requests');
    }
};
