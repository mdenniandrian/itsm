<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AddonConfig;
use App\Services\AuditLogger;
use Illuminate\Http\Request;

class BrandingController extends Controller
{
    private static array $defaults = [
        'app_name' => 'ITSM Enterprise',
        'app_subtitle' => 'Service Management',
        'meta_title' => 'ITSM Portal - Enterprise Service Desk',
        'logo_url' => null,
        'favicon_url' => null,
        'logo_type' => 'icon_text', // icon_text, image_banner, icon_only
        'company_name' => 'PT Bangden Digital Solusindo',
        'company_email' => 'no-reply@bangden.my.id',
        'company_phone' => '+62 812-3456-7890',
        'company_website' => 'https://bangden.my.id',
        'app_version' => '1.0.0',
        'copyright_text' => 'Made by @mdenniandrian_',
        'copyright_author' => '@mdenniandrian_',
        'copyright_author_url' => 'https://instagram.com/mdenniandrian_',
        'primary_color' => '#6366f1',
        'secondary_color' => '#8b5cf6',
        'teal_color' => '#06b6d4',
        'dark_bg_primary' => '#080b12',
        'dark_bg_card' => '#101626',
        'light_bg_primary' => '#f8fafc',
        'light_bg_card' => '#ffffff',
        'active_preset' => 'obsidian_indigo',
    ];

    public function show()
    {
        $addon = AddonConfig::firstOrCreate(
            ['addon_key' => 'branding'],
            [
                'name' => 'Company Profile & Theme Customizer',
                'description' => 'Customize company profile identity, app name, logo, version, copyright, and color themes.',
                'icon' => 'sparkles',
                'category' => 'customization',
                'is_enabled' => true,
                'config' => self::$defaults,
            ]
        );

        $merged = array_merge(self::$defaults, $addon->config ?? []);

        return response()->json([
            'branding' => $merged,
            'is_enabled' => (bool) $addon->is_enabled,
            'updated_at' => $addon->updated_at ? $addon->updated_at->toIso8601String() : null,
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied: Only Superadmin or Administrator can modify brand identity & themes.'], 403);
        }

        $validated = $request->validate([
            'app_name' => 'nullable|string|max:100',
            'app_subtitle' => 'nullable|string|max:150',
            'meta_title' => 'sometimes|string|max:150',
            'logo_url' => 'nullable|string',
            'favicon_url' => 'nullable|string',
            'logo_type' => 'sometimes|string|in:icon_text,image_banner,icon_only',
            'company_name' => 'nullable|string|max:150',
            'company_email' => 'nullable|email|max:150',
            'company_phone' => 'nullable|string|max:50',
            'company_website' => 'nullable|string|max:200',
            'app_version' => 'sometimes|string|max:50',
            'copyright_text' => 'sometimes|string|max:200',
            'copyright_author' => 'sometimes|string|max:100',
            'copyright_author_url' => 'nullable|string|max:255',
            'primary_color' => 'sometimes|string|max:30',
            'secondary_color' => 'sometimes|string|max:30',
            'teal_color' => 'sometimes|string|max:30',
            'dark_bg_primary' => 'sometimes|string|max:30',
            'dark_bg_card' => 'sometimes|string|max:30',
            'light_bg_primary' => 'sometimes|string|max:30',
            'light_bg_card' => 'sometimes|string|max:30',
            'active_preset' => 'sometimes|string|max:50',
        ]);

        if ($request->has('app_name')) {
            $val = $request->input('app_name');
            $validated['app_name'] = ($val !== null && trim($val) !== '') ? trim($val) : null;
        }

        if ($request->has('app_subtitle')) {
            $val = $request->input('app_subtitle');
            $validated['app_subtitle'] = ($val !== null && trim($val) !== '') ? trim($val) : null;
        }

        $addon = AddonConfig::firstOrCreate(
            ['addon_key' => 'branding'],
            [
                'name' => 'Company Profile & Theme Customizer',
                'description' => 'Customize company profile identity, app name, logo, version, copyright, and color themes.',
                'icon' => 'sparkles',
                'category' => 'customization',
                'is_enabled' => true,
                'config' => self::$defaults,
            ]
        );

        $oldConfig = $addon->config ?? [];
        $newConfig = array_merge(self::$defaults, $oldConfig, $validated);

        // Force explicit nulls if passed
        if (array_key_exists('app_name', $validated)) {
            $newConfig['app_name'] = $validated['app_name'];
        }
        if (array_key_exists('app_subtitle', $validated)) {
            $newConfig['app_subtitle'] = $validated['app_subtitle'];
        }

        $addon->update([
            'config' => $newConfig,
            'is_enabled' => true,
        ]);

        AuditLogger::logSystem(
            'CONFIG_CHANGE',
            "Administrator {$user->name} modified brand identity, logo, theme colors, and portal settings."
        );

        return response()->json([
            'message' => 'Brand, Logo, Version, Copyright, and Color Theme settings saved successfully.',
            'branding' => $newConfig,
        ]);
    }

    public function uploadLogo(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif,svg,webp|max:4096',
        ]);

        $file = $request->file('logo');
        $extension = $file->getClientOriginalExtension();
        $mime = $file->getMimeType();
        $base64 = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($file->getRealPath()));

        $addon = AddonConfig::firstOrCreate(
            ['addon_key' => 'branding'],
            [
                'name' => 'Company Profile & Theme Customizer',
                'description' => 'Customize company profile identity, app name, logo, version, copyright, and color themes.',
                'icon' => 'sparkles',
                'category' => 'customization',
                'is_enabled' => true,
                'config' => self::$defaults,
            ]
        );

        $cfg = array_merge(self::$defaults, $addon->config ?? []);
        $cfg['logo_url'] = $base64;

        $addon->update(['config' => $cfg]);

        return response()->json([
            'message' => 'New logo uploaded successfully.',
            'logo_url' => $base64,
            'branding' => $cfg,
        ]);
    }

    public function uploadFavicon(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        $request->validate([
            'favicon' => 'required|file|mimes:jpeg,png,jpg,gif,svg,webp,ico|max:2048',
        ]);

        $file = $request->file('favicon');
        $mime = $file->getMimeType() ?: 'image/x-icon';
        $base64 = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($file->getRealPath()));

        $addon = AddonConfig::firstOrCreate(
            ['addon_key' => 'branding'],
            [
                'name' => 'Company Profile & Theme Customizer',
                'description' => 'Customize company profile identity, app name, logo, version, copyright, and color themes.',
                'icon' => 'sparkles',
                'category' => 'customization',
                'is_enabled' => true,
                'config' => self::$defaults,
            ]
        );

        $cfg = array_merge(self::$defaults, $addon->config ?? []);
        $cfg['favicon_url'] = $base64;

        $addon->update(['config' => $cfg]);

        AuditLogger::logSystem(
            'CONFIG_CHANGE',
            "Administrator {$user->name} uploaded a custom browser tab favicon."
        );

        return response()->json([
            'message' => 'Custom browser favicon uploaded successfully.',
            'favicon_url' => $base64,
            'branding' => $cfg,
        ]);
    }

    public function reset(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        $addon = AddonConfig::where('addon_key', 'branding')->first();
        if ($addon) {
            $addon->update([
                'config' => self::$defaults,
                'is_enabled' => true,
            ]);
        }

        return response()->json([
            'message' => 'Theme and company branding profile reset to default.',
            'branding' => self::$defaults,
        ]);
    }
}
