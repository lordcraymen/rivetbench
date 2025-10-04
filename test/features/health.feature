@implemented
Feature: Service health probe
  In order to confirm the framework boots correctly
  As an operator
  I want to check the health endpoint

  Scenario: Health endpoint reports ok
    Given the REST server is running
    When I GET "/health"
    Then I receive a 200 OK response
    And the response body contains '{ "status": "ok" }'
