@implemented
Feature: CLI Named Parameters
  In order to use CLI tools more naturally
  As a command line user
  I want to pass parameters by name instead of JSON

  Scenario: Echo with named parameter
    Given I have the CLI tool available
    When I run "call echo -message 'hello world'"
    Then I should receive JSON containing '{"echoed": "hello world"}'

  Scenario: Multiple named parameters
    Given I have the CLI tool available
    When I run "call myfunc -text 'test' -number 42"
    Then I should receive JSON with "result" containing "Processed: test"
    And the "doubled" field should be 84

  Scenario: Number parsing
    Given I have the CLI tool available
    When I run "call myfunc -text 'decimal test' -number 3.14"
    Then the "doubled" field should be 6.28

  Scenario: Missing parameter value error
    Given I have the CLI tool available
    When I run "call echo -message"
    Then I should receive a CLI validation error