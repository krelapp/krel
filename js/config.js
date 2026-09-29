window.PO = window.PO || {};

// Every line of copy on the site lives here.
PO.config = {
  studioName: "KREL",
  tagline: "Come in. Stay.",

  about: [
    "KREL is the room. You don't come here to look at work.",
    "There is no meaning yet. Walk around anyway."
  ],

  email: "",
  links: [],

  projects: [
    { title: "Pull the Plug", tag: "Rite", desc: "The dark is scheduled. You do not ask who did it." },
    { title: "Night Shift", tag: "Rite", desc: "After six the windows belong to the room. The lamp is the only vote." },
    { title: "The Radio", tag: "Rite", desc: "Three voices. None of them will say the name twice." },
    { title: "The Back Wall", tag: "Place", desc: "The desks are a front. Water, the door, the plant." },
    { title: "Still Here", tag: "Mark", desc: "One rank. If you can read this, you have it." }
  ],

  awards: [
    { title: "Still here", year: "01" },
    { title: "Didn't leave", year: "02" },
    { title: "Came back", year: "03" }
  ],

  starterCode: `<!doctype html>
<html>
<head>
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    background: #1e1a17;
    font-family: system-ui, sans-serif;
    color: #f3e6d0;
  }
  .card {
    background: #c8452c;
    color: #f3e6d0;
    padding: 32px 40px;
    box-shadow: 8px 8px 0 #1e1a17;
    text-align: center;
  }
  button {
    margin-top: 16px;
    font: inherit;
    padding: 10px 18px;
    border: none;
    background: #1e1a17;
    color: #f3e6d0;
    cursor: pointer;
  }
</style>
</head>
<body>
  <div class="card">
    <h1>KREL</h1>
    <p>You are in the room.</p>
    <button onclick="this.textContent = 'Still here ' + (++n)">Stay</button>
  </div>
  <script>let n = 0;</script>
</body>
</html>
`
};
