import express from 'express'
import browserExtensionController from '../../controllers/browser-extension'
import enforceAbility from '../../middlewares/authentication/enforceAbility'

const router = express.Router()

/**
 * @swagger
 * /browser-extension/chatflows:
 *   get:
 *     tags:
 *       - browser-extension
 *     summary: Get chatflows available for browser extension
 *     description: Retrieve all chatflows that have "Browser Extension" in their visibility settings for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of chatflows available for the browser extension
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - User doesn't have permission
 *       500:
 *         description: Internal server error
 */
router.get('/chatflows', enforceAbility('ChatFlow'), browserExtensionController.getBrowserExtensionChatflows)

/**
 * @swagger
 * /browser-extension/chatflows/{id}/visibility:
 *   put:
 *     tags:
 *       - browser-extension
 *     summary: Update Browser Extension visibility for a chatflow
 *     description: Add or remove the Browser Extension visibility setting for a specific chatflow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Chatflow ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enabled
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: Whether to enable (true) or disable (false) Browser Extension visibility
 *     responses:
 *       200:
 *         description: Chatflow visibility settings updated successfully
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - User doesn't have permission
 *       404:
 *         description: Chatflow not found
 *       500:
 *         description: Internal server error
 */
router.put('/chatflows/:id/visibility', enforceAbility('ChatFlow'), browserExtensionController.updateBrowserExtensionVisibility)

export default router
