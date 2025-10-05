Feature: Request ID Parity Across Transports
  As a developer using RivetBench
  I want request IDs to be available in endpoint handlers
  So that I can trace and correlate logs across both REST and MCP transports

  Background:
    Given an endpoint that captures the request ID from context

  @wip
  Scenario: REST transport provides request ID
    When I call the endpoint via REST
    Then the handler should receive a valid UUID request ID
    And the response should include the request ID

  @wip
  Scenario: MCP transport provides request ID
    When I call the endpoint via MCP
    Then the handler should receive a valid UUID request ID
    And the response should include the request ID

  @wip
  Scenario: Request IDs are unique per request
    When I make multiple requests to the same endpoint
    Then each request should have a different request ID

  @wip
  Scenario: Request ID format is consistent
    Given I make a request via REST
    And I make a request via MCP
    Then both request IDs should follow RFC 4122 UUID format
    And both request IDs should have the same structure
