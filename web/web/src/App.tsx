import { useState } from "react";

import { MoveEditor } from "@mliolios/playmove-react";

function App() {
  const [code, setCode] = useState<string | undefined>(
    localStorage.getItem("playmove-code") ||
      `module temp::temp;

public fun foo(): bool {
  true
}

#[test]
fun test() {
    std::debug::print(&b"Welcome to the playground!".to_string());
}
`,
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
        enableLocalStorageSaving={true}
        localStorageKey="playmove-code"
      />
    </div>
  );
}

export default App;
