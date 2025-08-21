# Adding Products to Tag Manager V2

This document provides instructions on how to add additional products to the Tag Manager V2 application. The primary method for adding products is through a CSV import process, as the current web interface does not support manual addition of individual products.

## Overview

Tag Manager V2 allows users to manage product categories and assign products to them. Products are typically imported in bulk using a CSV file, which is then processed by a script to insert the data into the application's database.

## Method: CSV Import

The recommended way to add products is by importing a CSV file containing the product data. Follow these steps to prepare and import your product data:

### Step 1: Prepare the CSV File

1. **Create or Update the CSV File**: Use a spreadsheet editor (like Microsoft Excel or Google Sheets) or a text editor to create a CSV file named `input_file.csv`.
2. **Format the Data**: Ensure the CSV file has the following columns, which are required by the import script:
   - **Handle**: A unique identifier for the product (e.g., a SKU or ID).
   - **Title**: The name or title of the product.
   - **Product Category**: (Optional) The category ID to which the product should be assigned. Leave blank if no category is assigned initially.
3. **Save the File**: Save the file as `input_file.csv` in the `data/` directory of your Tag Manager V2 project. If a file already exists, you can update it with new product entries or overwrite it.

**Example CSV Format**:

```
Handle,Title,Product Category
12345,Product A,1
12346,Product B,
12347,Product C,2
```

### Step 2: Place the CSV File in the Correct Directory

- Ensure that the `input_file.csv` file is placed in the `data/` folder within your Tag Manager V2 project directory. The path should be `data/input_file.csv`.

### Step 3: Run the Import Script

1. **Open a Terminal or Command Prompt**: Navigate to the root directory of your Tag Manager V2 project.
2. **Execute the Script**: Run the following command to insert the products from the CSV file into the database:
   ```
   python data/insert_products.py
   ```
3. **Check Output**: The script will provide feedback in the terminal. If successful, it will display a message like "Products inserted successfully!". If there are errors, it will show an error message with details.

### Notes

- **Backup Existing Data**: Before running the script, consider backing up your existing `input_file.csv` or database (`data/products.db`) to avoid accidental data loss.
- **Unique Handles**: Ensure that the 'Handle' values for new products do not conflict with existing products in the database to prevent duplication or errors.
- **Category IDs**: If assigning a category during import, make sure the 'Product Category' value corresponds to a valid category ID in your database.

## Limitations

- **No Web UI for Individual Product Addition**: Currently, Tag Manager V2 does not provide a feature in the web interface to add products one at a time. Bulk import via CSV is the supported method.
- **Manual Category Assignment**: If categories are not specified in the CSV, you can assign them to products later using the web interface's category management features.

## Troubleshooting

- **Script Errors**: If the `insert_products.py` script fails, check the error message in the terminal. Common issues include incorrect CSV format, file not found, or database connection problems.
- **CSV Format Issues**: Ensure the CSV file is properly formatted with the correct column headers and no extra commas or special characters that might disrupt parsing.
- **Database Issues**: If products are not appearing in the application after import, verify that the database file `data/products.db` is accessible and not locked by another process.

If you encounter persistent issues, consult additional project documentation or contact a developer familiar with Tag Manager V2 for assistance.

## Future Considerations

If manual product addition through the web interface is a desired feature, consider requesting a development update to include a form or input mechanism for adding individual products directly within the application.

---

_This documentation is part of the Tag Manager V2 project and is maintained in the `docs/` directory for user reference._
