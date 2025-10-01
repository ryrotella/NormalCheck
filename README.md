# Social Interaction Safety Assessment

A JavaScript web application that uses AI embeddings and UMAP visualization to assess social interaction patterns and safety.

## Features

- **Embedding-based Analysis**: Uses multilingual-e5-large embeddings to understand behavioral descriptions
- **UMAP Visualization**: 2D projection of high-dimensional behavioral embeddings
- **Safety Categorization**: Classifies behaviors into Safe, Normal, Caution, and Warning categories
- **Interactive Interface**: Real-time analysis with visual feedback
- **Baseline Comparison**: Compares user input against established behavioral patterns

## How It Works

1. **Baseline Generation**: Creates embeddings for predefined behavioral categories:
   - Safe: Helpful, empathetic, boundary-respecting behaviors
   - Normal: Typical social interactions and workplace behaviors
   - Caution: Behaviors that may need attention in social settings
   - Warning: Potentially problematic or concerning behaviors

2. **User Analysis**: Takes user-provided behavioral descriptions and:
   - Generates embeddings using the same model
   - Projects into the existing UMAP space
   - Calculates similarity to baseline categories
   - Provides safety assessment with confidence scores

3. **Visualization**: Shows user position relative to baseline behaviors in 2D space

## Setup

1. **API Configuration**: 
   - You need to obtain an auth token from the replicate proxy service
   - Replace `YOUR_AUTH_TOKEN_HERE` in `app.js` with your actual token
   - The reference code uses: https://itp-ima-replicate-proxy.web.app/

2. **Running the Application**:
   - Open `index.html` in a modern web browser
   - Click "Generate Baseline Data" to initialize the system
   - Enter a behavioral description and click "Analyze Social Safety"

## Usage

1. **Generate Baseline**: Click the "Generate Baseline Data" button to create the reference behavioral patterns
2. **Enter Description**: Type a description of yourself or behaviors you want to analyze
3. **Analyze**: Click "Analyze Social Safety" to get your assessment
4. **Interpret Results**: View your safety category, confidence score, and position on the visualization

## Technical Details

- **Embeddings**: Uses `beautyyuyanli/multilingual-e5-large` model for text embeddings
- **Dimensionality Reduction**: UMAP with 8 neighbors, 0.1 minimum distance
- **Similarity Calculation**: Cosine similarity between embedding vectors
- **Visualization**: HTML5 Canvas with interactive points and grid

## Safety Categories

- **✅ SAFE**: Positive social behaviors, respects boundaries, shows empathy
- **✅ NORMAL**: Typical social interactions within healthy ranges
- **⚠️ CAUTION**: Some behaviors may need attention in social settings
- **🚨 WARNING**: Patterns suggest potential social interaction risks

## Limitations

- This is a demonstration tool and should not be used for clinical assessment
- Results are based on text similarity and may not capture all behavioral nuances
- API availability and costs depend on the embedding service provider
- Cultural and contextual factors may affect interpretation

## Files

- `index.html`: Main interface with styling and layout
- `app.js`: Core application logic, embedding analysis, and UMAP visualization
- `reference/2DUMAPLocal copy.js`: Original reference implementation

## Dependencies

- UMAP-js: For dimensionality reduction and visualization
- Replicate API: For generating text embeddings
- Math.seedrandom: For reproducible random number generation