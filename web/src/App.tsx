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

  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className="p-0">
      <MoveEditor
        height={"99.5vh"}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        code={code}
        setCode={setCode}
      />
    </div>
  );
}

export default App;
