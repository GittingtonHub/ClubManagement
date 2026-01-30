import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useState } from 'react';

function InventoryUI() {
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);

  return (

    <>
      <div className="table-div" id='table-div'>
        
        <div className="add-item-button">
            <button onClick={() => {
              setIsAddItemOpen(true);
              document.getElementById("table-div").style.display = "none";
            }}>Add Item</button>
        </div>

        <table className='inventory-table' id='inventory-table'>
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

        <Dialog open={isAddItemOpen} onClose={() => {
          setIsAddItemOpen(false);
          document.getElementById("table-div").style.display = "flex";
        }} className="add-item-dialog">
          <div className="add-item-dialog-backdrop" aria-hidden="true" />
          <div className="add-item-dialog-container">
            <DialogPanel className="add-item-dialog-panel">
              <DialogTitle className="add-item-header">Add New Item</DialogTitle>
              <div className="inner-add-item-container">
                <input
                  type="text"
                  placeholder="Item Name"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="add-item-name-input"
                  maxLength={100}
                />
                <input
                  type="text"
                  placeholder="Type"
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value)}
                  className="add-item-type-input"
                  maxLength={50}
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="add-item-price-input"
                  step="0.01"
                  min="0"
                  max="9999.99"
                />
                <textarea
                  placeholder="Description"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  className="add-item-description-input"
                  rows={4}
                />
                <div className="button-group">
                  <button 
                    onClick={() => {
                      // TODO: Handle add item logic - POST to backend
                      setIsAddItemOpen(false);
                      document.getElementById("table-div").style.display = "block";
                    }}
                    className="inline"
                  >
                    Add Item
                  </button>
                  <button 
                    onClick={() => {
                      setIsAddItemOpen(false);
                      document.getElementById("table-div").style.display = "block";
                    }}
                    className="inline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </DialogPanel>
          </div>
        </Dialog>

      </div>
    </>
  );
}

export default InventoryUI;