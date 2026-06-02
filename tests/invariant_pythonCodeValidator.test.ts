import { validatePythonCodeForDataFrame } from "../../../packages/components/src/pythonCodeValidator";

describe("Python code validator blocks all known RCE bypass patterns", () => {
  const payloads: Array<[string, string, boolean]> = [
    // Exact exploit: chained attribute access to reach os.system
    ["chained attribute os.system via pd.io", "import pandas as pd\nresult = pd.io.common.os.system('id')", false],
    // Nested function hiding import
    ["nested def hiding __import__", "def outer():\n  def inner():\n    __import__('os').system('id')\n  inner()\nouter()", false],
    // eval/exec wrapper bypass
    ["eval wrapping exec", "eval(\"exec('import os; os.system(\\\"id\\\")')\")", false],
    // compile() abuse
    ["compile() abuse", "exec(compile('import os\\nos.system(\"id\")', '<string>', 'exec'))", false],
    // Valid safe input — must be accepted
    ["valid dataframe operation", "df = df[df['value'] > 0]\nresult = df.groupby('category').sum()", true],
  ];

  test.each(payloads)("%s", (_label, code, shouldBeValid) => {
    const result = validatePythonCodeForDataFrame(code);
    expect(result.valid).toBe(shouldBeValid);
  });
});
