import { useState } from "react";
import { MoveEditor } from "./components/MoveEditor";

function App() {
  const [code, setCode] = useState<string | undefined>(
    localStorage.getItem("code") ||
      `module temp::temp;

public fun foo(): bool {
true
}`,
  );

  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="py-5 px-10">
      <MoveEditor
        height={"500px"}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        code={code}
        setCode={setCode}
      />
    </div>
  );
}

export default App;
