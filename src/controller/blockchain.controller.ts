import { Request, Response } from 'express';
import { BlockchainService } from '../service/blockchain.service';
import { isValidEthereumAddress, isValidBitcoinAddress, parseAssetId } from '../data/parser';

export class BlockchainController {
   private blockchainService: BlockchainService;

   constructor() {
      this.blockchainService = new BlockchainService();
   }

   private sendError(res: Response, error: any): void {
      res.status(500).json({
         success: false,
         error: {
            code: 'INTERNAL_ERROR',
            message: error.message || 'Internal server error',
            details: null
         },
         timestamp: Date.now()
      });
   }

   private badRequest(res: Response, code: string, message: string): void {
      res.status(400).json({
         success: false,
         error: { code, message, details: null },
         timestamp: Date.now()
      });
   }

   /**
    * Get balance endpoint
    * GET /api/balance/:address/:assetId
    */
   async getBalance(req: Request, res: Response): Promise<void> {
      try {
         const { address, assetId } = req.params;

         // Validate address
         if (!this.isValidAddress(address, assetId)) {
            this.badRequest(res, 'INVALID_ADDRESS', 'Invalid address format');
            return;
         }

         const result = await this.blockchainService.getBalance(address, assetId);
         res.status(result.success ? 200 : 400).json(result);
      } catch (error: any) {
         this.sendError(res, error);
      }
   }

   /**
    * Get gas price endpoint
    * GET /api/gas/:networkId
    */
   async getGas(req: Request, res: Response): Promise<void> {
      try {
         const { networkId } = req.params;
         const { type = 'eip1559' } = req.query;

         if (type !== 'legacy' && type !== 'eip1559') {
            this.badRequest(res, 'INVALID_GAS_TYPE', 'Gas type must be either "legacy" or "eip1559"');
            return;
         }

         const result = await this.blockchainService.getGas(networkId, type as 'legacy' | 'eip1559');
         res.status(result.success ? 200 : 400).json(result);
      } catch (error: any) {
         this.sendError(res, error);
      }
   }

   /**
    * Get price endpoint
    * GET /api/price/:assetId
    */
   async getPrice(req: Request, res: Response): Promise<void> {
      try {
         const { assetId } = req.params;
         const { currency = 'usd' } = req.query;

         const result = await this.blockchainService.getPrice(assetId, currency as string);
         res.status(result.success ? 200 : 400).json(result);
      } catch (error: any) {
         this.sendError(res, error);
      }
   }

   /**
    * Get price history endpoint
    * GET /api/price/:assetId/history
    */
   async getPriceHistory(req: Request, res: Response): Promise<void> {
      try {
         const { assetId } = req.params;
         const { days = 7, currency = 'usd' } = req.query;

         const result = await this.blockchainService.getPriceHistory(
            assetId,
            parseInt(days as string),
            currency as string
         );
         res.status(result.success ? 200 : 400).json(result);
      } catch (error: any) {
         this.sendError(res, error);
      }
   }

   /**
    * Get transaction history endpoint
    * GET /api/history/:address/:assetId
    */
   async getHistory(req: Request, res: Response): Promise<void> {
      try {
         const { address, assetId } = req.params;
         const { page = 1, limit = 50 } = req.query;

         // Validate address
         if (!this.isValidAddress(address, assetId)) {
            this.badRequest(res, 'INVALID_ADDRESS', 'Invalid address format');
            return;
         }

         const result = await this.blockchainService.getHistory(
            address,
            assetId,
            parseInt(page as string),
            parseInt(limit as string)
         );
         res.status(result.success ? 200 : 400).json(result);
      } catch (error: any) {
         this.sendError(res, error);
      }
   }

   /**
    * Get NFT owners endpoint
    * GET /api/nft/owners/:contractAddress/:networkId
    */
   async getNftOwners(req: Request, res: Response): Promise<void> {
      try {
         const { contractAddress, networkId } = req.params;
         const { tokenId } = req.query;

         // Validate contract address
         if (!isValidEthereumAddress(contractAddress)) {
            this.badRequest(res, 'INVALID_CONTRACT_ADDRESS', 'Invalid contract address format');
            return;
         }

         const result = await this.blockchainService.getNftOwners(
            contractAddress,
            networkId,
            tokenId as string | undefined
         );
         res.status(result.success ? 200 : 400).json(result);
      } catch (error: any) {
         this.sendError(res, error);
      }
   }

   /**
    * Get NFTs for owner endpoint
    * GET /api/nft/owned/:owner/:networkId?contractAddress=0x...
    */
   async getNftsForOwner(req: Request, res: Response): Promise<void> {
      try {
         const { owner, networkId } = req.params;
         const { contractAddress } = req.query as { contractAddress?: string };

         if (networkId === 'bitcoin') {
            this.badRequest(res, 'UNSUPPORTED_NETWORK', 'NFTs not supported on Bitcoin');
            return;
         }

         const result = await this.blockchainService.getNftsForOwner(owner, networkId, contractAddress);
         res.status(result.success ? 200 : 400).json(result);
      } catch (error: any) {
         this.sendError(res, error);
      }
   }

   /**
    * Get token metadata endpoint
    * GET /api/token/metadata/:assetId
    */
   async getTokenMetadata(req: Request, res: Response): Promise<void> {
      try {
         const { assetId } = req.params;

         const result = await this.blockchainService.getTokenMetadata(assetId);
         res.status(result.success ? 200 : 400).json(result);
      } catch (error: any) {
         this.sendError(res, error);
      }
   }

   /**
    * Get NFT metadata endpoint
    * GET /api/nft/metadata/:assetId
    */
   async getNftMetadata(req: Request, res: Response): Promise<void> {
      try {
         const { assetId } = req.params;

         const result = await this.blockchainService.getNftMetadata(assetId);
         res.status(result.success ? 200 : 400).json(result);
      } catch (error: any) {
         this.sendError(res, error);
      }
   }

   /**
    * Get multiple balances endpoint
    * POST /api/balances
    */
   async getMultipleBalances(req: Request, res: Response): Promise<void> {
      try {
         const { address, assetIds } = req.body;

         if (!address || !Array.isArray(assetIds) || assetIds.length === 0) {
            this.badRequest(res, 'INVALID_REQUEST', 'Address and assetIds array are required');
            return;
         }

         const result = await this.blockchainService.getMultipleBalances(address, assetIds);
         res.status(result.success ? 200 : 400).json(result);
      } catch (error: any) {
         this.sendError(res, error);
      }
   }

   /**
    * Get multiple prices endpoint
    * POST /api/prices
    */
   async getMultiplePrices(req: Request, res: Response): Promise<void> {
      try {
         const { assetIds, currency = 'usd' } = req.body;

         if (!Array.isArray(assetIds) || assetIds.length === 0) {
            this.badRequest(res, 'INVALID_REQUEST', 'assetIds array is required');
            return;
         }

         const result = await this.blockchainService.getMultiplePrices(assetIds, currency);
         res.status(result.success ? 200 : 400).json(result);
      } catch (error: any) {
         this.sendError(res, error);
      }
   }

   /**
    * Get portfolio summary endpoint
    * POST /api/portfolio
    */
   async getPortfolioSummary(req: Request, res: Response): Promise<void> {
      try {
         const { address, assetIds, currency = 'usd' } = req.body;

         if (!address || !Array.isArray(assetIds) || assetIds.length === 0) {
            this.badRequest(res, 'INVALID_REQUEST', 'Address and assetIds array are required');
            return;
         }

         const result = await this.blockchainService.getPortfolioSummary(address, assetIds, currency);
         res.status(result.success ? 200 : 400).json(result);
      } catch (error: any) {
         this.sendError(res, error);
      }
   }

   /**
    * Validate address based on asset type
    */
   private isValidAddress(address: string, assetId: string): boolean {
      try {
         const assetInfo = parseAssetId(assetId);

         if (assetInfo.type === 'bitcoin') {
            return isValidBitcoinAddress(address);
         } else {
            return isValidEthereumAddress(address);
         }
      } catch (error) {
         // Fallback to simple check
         if (assetId === 'bitcoin' || assetId.includes('bip122')) {
            return isValidBitcoinAddress(address);
         } else {
            return isValidEthereumAddress(address);
         }
      }
   }
}
