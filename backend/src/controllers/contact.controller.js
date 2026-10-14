import contactService from '../services/contact.service.js';

/**
 * Contact Controller
 * Handles customer contact form inquiries
 */
export const contactController = {
  /**
   * POST /api/contact
   * Submit a new customer inquiry
   */
  async submitMessage(req, res, next) {
    try {
      const saved = await contactService.createMessage(req.body);

      return res.status(201).json({
        success: true,
        message: 'Thank you! Your message has been received. We will get back to you shortly.',
        data: {
          id: saved._id,
          name: saved.name,
          createdAt: saved.createdAt,
        },
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  },
};

export default contactController;
