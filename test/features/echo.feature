@implemented
Feature: Echo endpoint
  In order to verify the basic RPC workflow
  As a client developer
  I want to receive the same message I send to the echo endpoint

  Scenario: Successful echo call
    Given the "echo" endpoint is registered with input '{ "message": "Hello" }'
    When I call the endpoint
    Then I should receive a response containing '{ "echoed": "Hello" }'

  Scenario: Validation failure for empty message
    Given the "echo" endpoint expects a non-empty "message"
    When I call the endpoint with '{ "message": "" }'
    Then I should receive an endpoint validation error
