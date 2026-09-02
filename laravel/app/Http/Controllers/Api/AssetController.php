<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AssetController extends Controller
{
    public function index(Request $request)
    {
        $query = Asset::with('assignedUser');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('serial_number', 'like', "%{$s}%")
                  ->orWhere('brand', 'like', "%{$s}%")
                  ->orWhere('model', 'like', "%{$s}%")
                  ->orWhere('ip_address', 'like', "%{$s}%");
            });
        }

        $assets = $query->orderBy('name', 'asc')->get()->map(function ($a) {
            return [
                'id' => $a->id,
                'name' => $a->name,
                'type' => $a->type,
                'brand' => $a->brand,
                'model' => $a->model,
                'serial_number' => $a->serial_number,
                'ip_address' => $a->ip_address,
                'status' => $a->status,
                'assigned_to' => $a->assigned_to,
                'assigned_to_name' => $a->assignedUser?->name,
                'location' => $a->location,
                'purchase_value' => $a->purchase_value,
                'purchase_date' => $a->purchase_date?->format('Y-m-d'),
                'notes' => $a->notes,
                'created_at' => $a->created_at->toIso8601String(),
            ];
        });

        return response()->json([
            'assets' => $assets,
            'total' => $assets->count(),
        ]);
    }

    public function show($id)
    {
        $a = Asset::with('assignedUser')->find($id);
        if (!$a) {
            return response()->json(['error' => 'Asset not found'], 404);
        }

        return response()->json([
            'id' => $a->id,
            'name' => $a->name,
            'type' => $a->type,
            'brand' => $a->brand,
            'model' => $a->model,
            'serial_number' => $a->serial_number,
            'ip_address' => $a->ip_address,
            'status' => $a->status,
            'assigned_to' => $a->assigned_to,
            'assigned_to_name' => $a->assignedUser?->name,
            'location' => $a->location,
            'purchase_value' => $a->purchase_value,
            'purchase_date' => $a->purchase_date?->format('Y-m-d'),
            'warranty_expiry' => $a->warranty_expiry?->format('Y-m-d'),
            'notes' => $a->notes,
            'created_at' => $a->created_at->toIso8601String(),
        ]);
    }

    public function stats()
    {
        $total = Asset::count();
        $totalValue = (float) Asset::sum('purchase_value');

        $byStatus = Asset::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(fn ($r) => ['status' => $r->status, 'count' => (int) $r->count]);

        $byType = Asset::select('type', DB::raw('count(*) as count'))
            ->groupBy('type')
            ->get()
            ->map(fn ($r) => ['type' => $r->type, 'count' => (int) $r->count]);

        return response()->json([
            'total' => $total,
            'totalValue' => $totalValue,
            'byStatus' => $byStatus,
            'byType' => $byType,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'manager', 'agent'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:laptop,desktop,server,network,software,mobile,printer,other',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'ip_address' => 'nullable|string|max:50',
            'status' => 'nullable|in:active,inactive,maintenance,retired',
            'assigned_to' => 'nullable|exists:users,id',
            'location' => 'nullable|string|max:255',
            'purchase_value' => 'nullable|numeric',
            'purchase_date' => 'nullable|date',
            'warranty_expiry' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $asset = Asset::create($validated);

        return response()->json($asset, 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'manager', 'agent'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $asset = Asset::find($id);
        if (!$asset) {
            return response()->json(['error' => 'Asset not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|in:laptop,desktop,server,network,software,mobile,printer,other',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'ip_address' => 'nullable|string|max:50',
            'status' => 'sometimes|in:active,inactive,maintenance,retired',
            'assigned_to' => 'nullable|exists:users,id',
            'location' => 'nullable|string|max:255',
            'purchase_value' => 'nullable|numeric',
            'purchase_date' => 'nullable|date',
            'warranty_expiry' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $asset->update($validated);

        return response()->json($asset);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'manager'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $asset = Asset::find($id);
        if (!$asset) {
            return response()->json(['error' => 'Asset not found'], 404);
        }

        $asset->delete();
        return response()->json(['message' => 'Asset deleted successfully']);
    }
}
