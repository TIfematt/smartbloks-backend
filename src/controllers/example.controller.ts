import { Request, Response } from 'express';

/**
 * Example controller with basic CRUD operations
 */
export const exampleController = {
  /**
   * Get all items
   */
  getAll: async (req: Request, res: Response): Promise<void> => {
    try {
      const items = [
        { id: 1, name: 'Item 1', description: 'Description for item 1' },
        { id: 2, name: 'Item 2', description: 'Description for item 2' },
        { id: 3, name: 'Item 3', description: 'Description for item 3' }
      ];
      
      res.status(200).json({
        success: true,
        data: items
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve items',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  
  /**
   * Get item by ID
   */
  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      
      const item = { id, name: `Item ${id}`, description: `Description for item ${id}` };
      
      res.status(200).json({
        success: true,
        data: item
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve item',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  
  /**
   * Create new item
   */
  create: async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, description } = req.body;
      
      // Validate input
      if (!name) {
        res.status(400).json({
          success: false,
          message: 'Name is required'
        });
        return;
      }
      
      const newItem = {
        id: Math.floor(Math.random() * 1000),
        name,
        description: description || ''
      };
      
      res.status(201).json({
        success: true,
        message: 'Item created successfully',
        data: newItem
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create item',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}; 