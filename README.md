# N(DATA) - PURE. RAW. DATA.

An open-source repository providing technical specifications for electronics. The project is designed for transparency, offering raw, organized data accessible via a dedicated web interface and a comprehensive JSON API.

## 🚀 Overview

N(DATA) serves as a single, uncluttered source for technical specifications across various consumer electronic categories. The core philosophy is **"No clutter. Just data."** Every product entry is standardized, categorized, and assigned a unique identifier to facilitate easy searching and data integration.

### Key Features

* **Standardized JSON Data:** All data is provided in a consistent JSON format, ready for immediate use in applications, scripts, or analytics.
* **Web Interface:** A publicly accessible website allows users to browse, search, and filter the entire database.
* **Open API:** The entire dataset is accessible via a simple JSON API.
* **Focus on DIY:** Entries often include a dedicated section for `diy_resources`, linking to repair guides, firmware archives, and official manuals.

## 📦 Data Structure and Organization

Products are organized using a simple naming convention, category grouping, and a unique, sequential ID system to prevent duplication across hundreds of thousands of records. The sequential ID uses a six-digit format to ensure future scalability and handling of up to 999,999 products per category.

| Field | Description | Naming/Value Convention |
| :--- | :--- | :--- |
| **id** | A unique product identifier. | A three-letter category prefix followed by a hyphen and a **six-digit sequential number** (`[CAT]-[XXXXXX]`). This is the primary key and must be unique. |
| **category** | The general type of product. | All lowercase, singular, descriptive word(s) (e.g., `smartphones`, `laptops`). |
| **name** | The official, common name of the product. | Manufacturer's official model name. |
| **brand** | The manufacturer of the product. | Official brand name. |
| **price** | The listed or typical retail price (USD). | Numerical value (integer). |
| **description** | A brief summary of the product. | Short, marketing-style sentence highlighting key selling points. |
| **specs** | Technical specifications. | Nested object containing key-value pairs specific to the product type (e.g., `processor`, `ram`, `display`). |
| **images** | URLs for product images. | Array of image URLs. |
| **diy_resources** | Links to repair/software resources. | Array of structured objects containing `title`, `url`, and `type`. |

### ID Prefix Reference

| Prefix | Category | Example ID |
| :--- | :--- | :--- |
| `phn` | Smartphones | `phn-000001` |
| `lap` | Laptops | `lap-000003` |
| `wear` | Wearables (Audio, Smartwatches) | `wear-000010` |
| `comp` | Components (CPUs, GPUs, Storage) | `comp-000150` |
| `tab` | Tablets | `tab-000005` |
| `cam` | Cameras | `cam-000007` |

## 🔗 API and Documentation

The entire dataset is designed to be consumed via a simple JSON API.

* **API Endpoint:** Consult the full [API Documentation](./api/docs.html) for specific endpoint details, filtering parameters, and response schema.
* **Live Data:** Access the raw, unfiltered JSON data directly via the [API Page](./api/api.html).

## 🤝 Contributing

N(DATA) is an open-source initiative and welcomes contributions to expand the database, improve accuracy, or enhance the overall project infrastructure.

* **Report Errors:** If you find a data inaccuracy or a broken link, please use the [Report Forum](./pages/report-forum.html).
* **Code Contributions:** Submit pull requests and view the code repository on [GitHub](https://github.com/Abdulaziz-hu/NData).

## 📝 License

This project is released under the **MIT License**.

The full license is provided below:

```text
Copyright 2025 Abdulaziz-Hu

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.