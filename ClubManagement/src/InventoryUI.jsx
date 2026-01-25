
function InventoryUI() {
  return (

    <>
      <div class="table-div">
        
        <div class="add-item-button">
            <button>Add Item</button>
        </div>

        <table>
          {/* TODO: change field names to better match with database */}
          <tr class="table-header">
            <th>Item No.</th>
            <th>Item Name</th>
            <th>Quantity</th>
          </tr>

          <tr class="table-row">
            <td class="table-cell-itemno">1</td>
            <td class="table-cell-name">Soccer Ball</td>
            <td>15</td>
          </tr>
        </table>

      </div>
    </>
  );
}

export default InventoryUI;