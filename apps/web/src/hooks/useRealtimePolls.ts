"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface LivePollUpdate {
  pollId: string;
  totalVotes: number;
  results: Array<{
    option: string;
    index: number;
    count: number;
    percentage: number;
  }>;
  totalOpinions: number;
  velocity: number; // votes per minute
  isLive: boolean;
}

export function useRealtimePolls(pollIds: string[]) {
  const [liveUpdates, setLiveUpdates] = useState<Record<string, LivePollUpdate>>({});
  const [connectedPolls, setConnectedPolls] = useState<Set<string>>(new Set());
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Simulate real-time updates by gradually changing vote counts
  const simulateLiveUpdate = useCallback((pollId: string, currentResults: any) => {
    setLiveUpdates((prev) => {
      const update = prev[pollId] || {
        pollId,
        totalVotes: currentResults.total_votes || 0,
        results: currentResults.results || [],
        totalOpinions: currentResults.total_opinions || 0,
        velocity: Math.floor(Math.random() * 100) + 10, // 10-110 votes/min
        isLive: true,
      };

      // Randomly increment votes to simulate live activity
      if (Math.random() > 0.3) {
        const optionToUpdate = Math.floor(Math.random() * update.results.length);
        const newResults = [...update.results];
        newResults[optionToUpdate].count += Math.floor(Math.random() * 3) + 1;
        update.totalVotes += Math.floor(Math.random() * 3) + 1;
        update.totalVotes = Math.min(update.totalVotes, update.totalVotes + 5);

        // Recalculate percentages
        newResults.forEach((r) => {
          r.percentage = update.totalVotes > 0 ? Math.round((r.count / update.totalVotes) * 100) : 0;
        });
        update.results = newResults;
      }

      // Randomly update opinion count
      if (Math.random() > 0.7) {
        update.totalOpinions += 1;
      }

      return { ...prev, [pollId]: update };
    });
  }, []);

  // Simulate WebSocket connection by setting up polling interval
  useEffect(() => {
    if (pollIds.length === 0) return;

    updateIntervalRef.current = setInterval(() => {
      pollIds.forEach((pollId) => {
        // In a real implementation, this would fetch from /api/v1/polls/:id
        // For now, we'll simulate with a placeholder
        simulateLiveUpdate(pollId, {});
      });
    }, 2000); // Update every 2 seconds

    setConnectedPolls(new Set(pollIds));

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [pollIds, simulateLiveUpdate]);

  return {
    liveUpdates,
    isConnected: connectedPolls.size > 0,
    connectedPolls,
  };
}

// Hook for live activity indicators
export function useActivityFeed() {
  const [activities, setActivities] = useState<
    Array<{
      id: string;
      type: "vote" | "opinion" | "milestone";
      message: string;
      timestamp: Date;
      pollId: string;
    }>
  >([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const messages = [
        "45 people voted on Politics polls in the last minute",
        "New top opinion: 'This will change the course'",
        "Sports poll trending: 1,200+ new votes",
        "Tech discussion milestone: 5K opinions shared",
        "Local poll: Your city voted 72% Yes",
        "Breaking: Entertainment poll has 50K+ votes",
      ];

      setActivities((prev) => {
        const newActivity = {
          id: Math.random().toString(36),
          type: (["vote", "opinion", "milestone"] as const)[Math.floor(Math.random() * 3)],
          message: messages[Math.floor(Math.random() * messages.length)],
          timestamp: new Date(),
          pollId: Math.random().toString(36),
        };
        return [newActivity, ...prev.slice(0, 4)]; // Keep last 5
      });
    }, 4000); // New activity every 4 seconds

    return () => clearInterval(interval);
  }, []);

  return { activities };
}
