@implemented
Feature: CLI Raw Output
  In order to integrate with shell scripts and other CLI tools
  As a command line user  
  I want to receive simple values without JSON formatting

  Scenario: Simple echo with raw output
    Given I have the CLI tool available
    When I run "call echo -message 'hello' --raw"
    Then I should receive the text "hello" without JSON formatting

  Scenario: Raw output with short flag
    Given I have the CLI tool available
    When I run "call uppercase -text 'hello world' -r"
    Then I should receive the text "HELLO WORLD" without JSON formatting

  Scenario: Complex object falls back to JSON in raw mode
    Given I have the CLI tool available
    When I run "call myfunc -text 'test' -number 5 --raw"
    Then I should receive JSON output despite raw flag

  Scenario: Raw output with JSON input
    Given I have the CLI tool available
    When I run "call echo --input '{\"message\":\"test\"}' --raw"
    Then I should receive the text "test" without JSON formatting