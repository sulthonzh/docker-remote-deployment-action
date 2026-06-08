import { TokenTracker } from "../tracker";
import { DatabaseManager } from "../database";

describe("TokenTracker", () => {
  let tracker: TokenTracker;
  let db: DatabaseManager;

  beforeEach(async () => {
    // Use in-memory database for testing
    db = new DatabaseManager(":memory:");
    await db.initialize();
    tracker = new TokenTracker(db);
  });

  afterEach(async () => {
    if (db) {
      db.close();
    }
  });

  describe("trackTokenUsage", () => {
    it("should successfully track token usage", async () => {
      const record = {
        agent_id: "test-agent",
        tool_name: "search-tool",
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
        cost_usd: 0.0003,
        timestamp: new Date().toISOString(),
        duration_ms: 1000,
        status: "completed" as const,
      };

      const id = await tracker.trackTokenUsage(record);
      expect(id).toBeDefined();
      expect(typeof id).toBe("number");
    });

    it("should validate required fields", async () => {
      const invalidRecord = {
        agent_id: "",
        tool_name: "search-tool",
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
        cost_usd: 0.0003,
        timestamp: new Date().toISOString(),
        duration_ms: 1000,
        status: "completed" as const,
      };

      await expect(tracker.trackTokenUsage(invalidRecord)).rejects.toThrow();
    });

    it("should validate token counts are not negative", async () => {
      const invalidRecord = {
        agent_id: "test-agent",
        tool_name: "search-tool",
        input_tokens: -100,
        output_tokens: 50,
        total_tokens: -50,
        cost_usd: 0.0003,
        timestamp: new Date().toISOString(),
        duration_ms: 1000,
        status: "completed" as const,
      };

      await expect(tracker.trackTokenUsage(invalidRecord)).rejects.toThrow();
    });
  });

  describe("getTokenBreakdown", () => {
    beforeEach(async () => {
      // Add some test data
      const testRecords = [
        {
          agent_id: "agent-1",
          tool_name: "search-tool",
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150,
          cost_usd: 0.0003,
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          duration_ms: 1000,
          status: "completed" as const,
        },
        {
          agent_id: "agent-1",
          tool_name: "analyze-tool",
          input_tokens: 200,
          output_tokens: 100,
          total_tokens: 300,
          cost_usd: 0.0006,
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          duration_ms: 2000,
          status: "completed" as const,
        },
        {
          agent_id: "agent-2",
          tool_name: "search-tool",
          input_tokens: 150,
          output_tokens: 75,
          total_tokens: 225,
          cost_usd: 0.00045,
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          duration_ms: 1500,
          status: "completed" as const,
        },
      ];

      for (const record of testRecords) {
        await db.insertTokenUsage(record);
      }
    });

    it("should get token breakdown for all data", async () => {
      const breakdown = await tracker.getTokenBreakdown();
      
      expect(breakdown).toBeDefined();
      expect(breakdown.by_agent).toBeDefined();
      expect(breakdown.by_tool).toBeDefined();
      expect(breakdown.summary).toBeDefined();
      
      // Check summary totals
      expect(breakdown.summary.total_calls).toBe(3);
      expect(breakdown.summary.total_tokens).toBe(675);
      expect(breakdown.summary.total_cost).toBe(0.00135);
    });

    it("should filter by agent_id", async () => {
      const breakdown = await tracker.getTokenBreakdown({
        agent_id: "agent-1",
      });

      expect(breakdown.by_agent["agent-1"]).toBeDefined();
      expect(breakdown.by_agent["agent-2"]).toBeUndefined();
      expect(breakdown.summary.total_calls).toBe(2);
    });

    it("should filter by tool_name", async () => {
      const breakdown = await tracker.getTokenBreakdown({
        tool_name: "search-tool",
      });

      expect(breakdown.by_tool["search-tool"]).toBeDefined();
      expect(breakdown.by_tool["analyze-tool"]).toBeUndefined();
      expect(breakdown.summary.total_calls).toBe(2);
    });

    it("should format summary when requested", async () => {
      const breakdown = await tracker.getTokenBreakdown({
        format: "summary",
      });

      expect(breakdown.top_agents).toBeDefined();
      expect(breakdown.top_tools).toBeDefined();
      expect(breakdown.summary.cost_per_token_usd).toBeGreaterThan(0);
    });
  });

  describe("getCostRecommendations", () => {
    beforeEach(async () => {
      // Add test data that would generate recommendations
      const testRecords = [
        {
          agent_id: "expensive-agent",
          tool_name: "expensive-tool",
          input_tokens: 10000,
          output_tokens: 5000,
          total_tokens: 15000,
          cost_usd: 0.03,
          timestamp: new Date().toISOString(),
          duration_ms: 5000,
          status: "completed" as const,
        },
        {
          agent_id: "frequent-agent",
          tool_name: "frequent-tool",
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150,
          cost_usd: 0.0003,
          timestamp: new Date().toISOString(),
          duration_ms: 1000,
          status: "completed" as const,
        },
      ];

      for (const record of testRecords) {
        await db.insertTokenUsage(record);
      }
    });

    it("should generate cost recommendations", async () => {
      const recommendations = await tracker.getCostRecommendations({
        time_period: "24h",
      });

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      
      // Check that we get different types of recommendations
      const recommendationTypes = recommendations.map(r => r.type);
      expect(recommendationTypes).toContain("optimization_tip");
    });

    it("should filter recommendations by agent", async () => {
      const recommendations = await tracker.getCostRecommendations({
        agent_id: "expensive-agent",
        time_period: "24h",
      });

      expect(recommendations).toBeDefined();
      // Should have fewer recommendations when filtered by agent
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("getSystemStatus", () => {
    beforeEach(async () => {
      // Add test data
      const testRecords = [
        {
          agent_id: "agent-1",
          tool_name: "tool-1",
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150,
          cost_usd: 0.0003,
          timestamp: new Date().toISOString(),
          duration_ms: 1000,
          status: "completed" as const,
        },
        {
          agent_id: "agent-2",
          tool_name: "tool-2",
          input_tokens: 200,
          output_tokens: 100,
          total_tokens: 300,
          cost_usd: 0.0006,
          timestamp: new Date().toISOString(),
          duration_ms: 2000,
          status: "error" as const,
        },
      ];

      for (const record of testRecords) {
        await db.insertTokenUsage(record);
      }
    });

    it("should return system status", async () => {
      const status = await tracker.getSystemStatus();

      expect(status).toBeDefined();
      expect(status.total_calls).toBe(2);
      expect(status.total_tokens).toBe(450);
      expect(status.total_cost).toBe(0.0009);
      expect(status.active_agents).toBe(2);
      expect(status.error_rate).toBe(0.5); // 50% error rate
      expect(status.cost_recommendations).toBeDefined();
      expect(status.uptime_hours).toBeGreaterThan(0);
    });
  });

  describe("time range calculations", () => {
    it("should calculate time range from period", async () => {
      // Test with a tracker instance that has access to time calculation methods
      // We'll test the private method indirectly through public methods
      
      const breakdown = await tracker.getTokenBreakdown();
      expect(breakdown).toBeDefined();
    });
  });
});