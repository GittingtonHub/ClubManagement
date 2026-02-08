import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useState } from 'react';
import { useEffect } from 'react';


function InventoryUI() {
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [itemNameError, setItemNameError] = useState('');
  const [itemTypeError, setItemTypeError] = useState('');
  const [itemPriceError, setItemPriceError] = useState('');
  const [itemDescriptionError, setItemDescriptionError] = useState('');
  const [inventory, setInventory] = useState([]);


  const validateItemName = (name) => {
    if (!name || name.trim() === '') {
      setItemNameError('Item name is required');
      return false;
    }
    if (name.length > 100) {
      setItemNameError('Item name must be 100 characters or less');
      return false;
    }
    setItemNameError('');
    return true;
  };

  const validateItemType = (type) => {
    if (!type || type.trim() === '') {
      setItemTypeError('Type is required');
      return false;
    }
    if (type.length > 50) {
      setItemTypeError('Type must be 50 characters or less');
      return false;
    }
    setItemTypeError('');
    return true;
  };

  const validateItemPrice = (price) => {
    if (!price || price === '') {
      setItemPriceError('Price is required');
      return false;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setItemPriceError('Price must be a positive number');
      return false;
    }
    if (priceNum > 9999.99) {
      setItemPriceError('Price must be less than $10,000');
      return false;
    }
    setItemPriceError('');
    return true;
  };

  const validateItemDescription = (description) => {
    if (!description || description.trim() === '') {
      setItemDescriptionError('Description is required');
      return false;
    }
    setItemDescriptionError('');
    return true;
  };

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch('/api/inventory.php', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        const data = await response.json();
        setInventory(data);
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
      }
    };
    
    fetchInventory();
  }, []);

  const handleAddItem = async () => {
    // Validate all fields first
    const isNameValid = validateItemName(itemName);
    const isTypeValid = validateItemType(itemType);
    const isPriceValid = validateItemPrice(itemPrice);
    const isDescValid = validateItemDescription(itemDescription);
    
    if (!isNameValid || !isTypeValid || !isPriceValid || !isDescValid) {
      return;
    }
    
    try {
      const response = await fetch('/api/inventory.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          name: itemName,
          type: itemType,
          price: itemPrice,
          description: itemDescription
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setInventory([...inventory, data.item]); // Add new item to list
        setItemName('');
        setItemType('');
        setItemPrice('');
        setItemDescription('');
        setIsAddItemOpen(false);
        document.getElementById("table-div").style.display = "flex";
      }
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

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
          <tr className="table-header">
            <th>Item No.</th>
            <th>Item Name</th>
            <th>Quantity</th>
          </tr>

          {inventory.map((item, index) => (
            <tr className="table-row" key={item.id}>
              <td className="table-cell-itemno">{index + 1}</td>
              <td className="table-cell-name">{item.name}</td>
              <td>{item.quantity}</td>
            </tr>
          ))}
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
                  onChange={(e) => {
                    setItemName(e.target.value);
                    if (itemNameError) validateItemName(e.target.value);
                  }}
                  onBlur={() => validateItemName(itemName)}
                  className="add-item-name-input"
                  maxLength={100}
                  style={{
                    border: itemNameError ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                />
                {itemNameError && <span style={{ color: 'red', fontSize: '14px' }}>{itemNameError}</span>}

                <input
                  type="text"
                  placeholder="Type"
                  value={itemType}
                  onChange={(e) => {
                    setItemType(e.target.value);
                    if (itemTypeError) validateItemType(e.target.value);
                  }}
                  onBlur={() => validateItemType(itemType)}
                  className="add-item-type-input"
                  maxLength={50}
                  style={{
                    border: itemTypeError ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                />
                {itemTypeError && <span style={{ color: 'red', fontSize: '14px' }}>{itemTypeError}</span>}

                <input
                  type="number"
                  placeholder="Price"
                  value={itemPrice}
                    onChange={(e) => {
                    setItemPrice(e.target.value);
                    if (itemPriceError) validateItemPrice(e.target.value);
                  }}
                  onBlur={() => validateItemPrice(itemPrice)}
                  className="add-item-price-input"
                  step="0.01"
                  min="0"
                  max="9999.99"
                  style={{
                    border: itemPriceError ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                />
                {itemPriceError && <span style={{ color: 'red', fontSize: '14px' }}>{itemPriceError}</span>}

                <textarea
                  placeholder="Description"
                  value={itemDescription}
                  onChange={(e) => {
                    setItemDescription(e.target.value);
                    if (itemDescriptionError) validateItemDescription(e.target.value);
                  }}
                  onBlur={() => validateItemDescription(itemDescription)}
                  className="add-item-description-input"
                  rows={4}
                  style={{
                    border: itemDescriptionError ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                />
                {itemDescriptionError && <span style={{ color: 'red', fontSize: '14px' }}>{itemDescriptionError}</span>}

                <div className="button-group">
                  <button 
                    onClick={() => {
                      handleAddItem()
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