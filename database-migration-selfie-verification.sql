-- Database Migration: Add Selfie Verification Fields
-- Run this SQL in your Supabase SQL Editor to add selfie verification to existing tables

-- Add selfie verification columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS selfie_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS selfie_photo_url TEXT,
ADD COLUMN IF NOT EXISTS selfie_verified_at TIMESTAMP WITH TIME ZONE;

-- Add selfie verification columns to technicians table
ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS selfie_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS selfie_photo_url TEXT,
ADD COLUMN IF NOT EXISTS selfie_verified_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_selfie_verified ON users(selfie_verified);
CREATE INDEX IF NOT EXISTS idx_technicians_selfie_verified ON technicians(selfie_verified);
