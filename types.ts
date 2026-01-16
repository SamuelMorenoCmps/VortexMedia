import React from 'react';

export enum AppMode {
  DOWNLOADER = 'DOWNLOADER',
  GENERATOR = 'GENERATOR'
}

export interface AnalysisResult {
  platform: string;
  isValid: boolean;
  summary: string;
  contentType: 'video' | 'audio' | 'image' | 'unknown';
  thumbnailUrl?: string;
  isPlaylist?: boolean;
}

export interface GeneratedVideo {
  uri: string;
  expiry?: string;
}

export interface PlatformConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}

export interface HistoryItem {
  id: string;
  url: string;
  platform: string;
  timestamp: number;
  summary: string;
}