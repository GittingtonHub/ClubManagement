
function Header() {
  return (
    // The header should snap to the top of the page
    <header>
        <h1>Club Management</h1>

        <div class="topnav">
            <a class="" href="#home">Home</a>
            <a class="active" href="#inventory">Inventory</a>
        </div>

        <div class="login">
            <button>Login</button>
        </div>
        
    </header>
  );
}

export default Header;