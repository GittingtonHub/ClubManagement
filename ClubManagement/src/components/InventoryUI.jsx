
function InventoryUI() {
  return (

    <>
      <div className="table-div">
        
        <div className="add-item-button">
            <button>Add Item</button>
        </div>

        <table>
          {/* // TODO: Replace hardcoded data with API call to PHP backend
          // Should fetch inventory from MySQL via PHP API
          // Example:
          // useEffect(() => {
          //   fetch('/api/inventory.php')
          //     .then(res => res.json())
          //     .then(data => setInventory(data));
          // }, []); */}
          <tr className="table-header">
            <th>Item No.</th>
            <th>Item Name</th>
            <th>Quantity</th>
          </tr>

          <tr className="table-row">
            {/* TODO: Map over actual inventory data from backend */}
            <td className="table-cell-itemno">1</td>
            <td className="table-cell-name">Soccer Ball</td>
            <td>15</td>
          </tr>
        </table>

      </div>
    </>
  );
}

export default InventoryUI;