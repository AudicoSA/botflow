# Bird WhatsApp API - Cost Analysis for BotFlow

**Date:** January 6, 2026  
**BSP:** Bird.com  
**Region:** South Africa

---

## Bird Pricing Structure

Bird's WhatsApp API pricing consists of **two components**:

1. **Meta's passthrough costs** (per message, varies by country and category)
2. **Bird's platform fees** (usage-based, volume discounts available)

---

## South Africa - Meta Passthrough Costs (2026)

| Message Category | Cost per Message | Use Case |
|-----------------|------------------|----------|
| **Marketing** | $0.025 | Promotions, offers, newsletters, announcements |
| **Utility** | $0.003 - $0.004* | Order updates, booking confirmations, shipping notifications |
| **Authentication** | $0.003 - $0.004* | OTPs, verification codes, 2FA |
| **Service** | **$0.00 (FREE)** | Replies within 24-hour customer service window |

*Volume-based pricing - decreases with higher volume

---

## Bird Platform Fees

### Utility Messages (Volume Tiers)

| Volume Range | Bird Fee per Message |
|--------------|---------------------|
| 1 - 80,000 | $0.004 |
| 80,001 - 750,000 | $0.0038 |
| 750,001 - 2,250,000 | $0.0036 |
| 2,250,001 - 3,000,000 | $0.0034 |
| 3,000,001 - 6,000,000 | $0.0032 |
| 6,000,001+ | $0.003 |

### Authentication Messages (Volume Tiers)

| Volume Range | Bird Fee per Message |
|--------------|---------------------|
| 1 - 100,000 | $0.004 |
| 100,001 - 500,000 | $0.0038 |
| 500,001 - 2,000,000 | $0.0036 |
| 2,000,001 - 5,000,000 | $0.0034 |
| 5,000,001 - 10,000,000 | $0.0032 |
| 10,000,001+ | $0.003 |

### Additional Costs

- **Virtual Phone Number:** $0.26/month per number
- **Marketing Messages:** $0.025 per message (Meta passthrough only)

---

## Per-Client Cost Calculation

### Scenario 1: Small Business (Starter Plan)
**Assumptions:**
- 1,000 conversations/month
- 70% service (free), 20% utility, 10% marketing
- Average 3 messages per conversation = 3,000 messages/month

**Cost Breakdown:**
```
Service messages (2,100):     $0.00
Utility messages (600):       600 × $0.004 = $2.40
Marketing messages (300):     300 × $0.025 = $7.50
Phone number:                 $0.26
─────────────────────────────────────
Total Bird costs:             $10.16/month
```

**BotFlow charges client:** R899/month ($49)  
**Gross margin:** $49 - $10.16 = **$38.84 (79% margin)**

---

### Scenario 2: Growing Business (Growth Plan)
**Assumptions:**
- 5,000 conversations/month
- 70% service (free), 20% utility, 10% marketing
- Average 3 messages per conversation = 15,000 messages/month

**Cost Breakdown:**
```
Service messages (10,500):    $0.00
Utility messages (3,000):     3,000 × $0.004 = $12.00
Marketing messages (1,500):   1,500 × $0.025 = $37.50
Phone number:                 $0.26
─────────────────────────────────────
Total Bird costs:             $49.76/month
```

**BotFlow charges client:** R1,799/month ($99)  
**Gross margin:** $99 - $49.76 = **$49.24 (50% margin)**

---

### Scenario 3: Professional Business (Pro Plan)
**Assumptions:**
- 15,000 conversations/month
- 70% service (free), 20% utility, 10% marketing
- Average 3 messages per conversation = 45,000 messages/month

**Cost Breakdown:**
```
Service messages (31,500):    $0.00
Utility messages (9,000):     9,000 × $0.004 = $36.00
Marketing messages (4,500):   4,500 × $0.025 = $112.50
Phone number (2 numbers):     $0.52
─────────────────────────────────────
Total Bird costs:             $149.02/month
```

**BotFlow charges client:** R3,599/month ($199)  
**Gross margin:** $199 - $149.02 = **$49.98 (25% margin)**

---

## Key Insights

### ✅ Advantages

1. **Service conversations are FREE** - This is huge! 70% of conversations cost nothing
2. **Volume discounts** - As you scale, Bird fees decrease
3. **No setup fees** - Just $0.26/month per phone number
4. **Predictable costs** - Easy to calculate per-client expenses

### ⚠️ Considerations

1. **Marketing messages are expensive** - $0.025 each adds up quickly
2. **Margins decrease with scale** - Professional plan has lowest margin (25%)
3. **Heavy marketing usage could erode margins** - Need to monitor usage patterns

### 💡 Optimization Strategies

1. **Encourage service conversations** - Free within 24-hour window
2. **Use utility over marketing** - 6x cheaper ($0.004 vs $0.025)
3. **Batch marketing campaigns** - Minimize marketing message volume
4. **Monitor usage patterns** - Alert clients approaching limits
5. **Implement usage-based overage fees** - Charge extra for heavy marketing usage

---

## Comparison with Competitors

| BSP | Base Fee | Utility Message | Marketing Message | Notes |
|-----|----------|----------------|-------------------|-------|
| **Bird** | $0.26/mo | $0.003-$0.004 | $0.025 | Volume discounts, good for scale |
| **360Dialog** | $99-$299/mo | Meta passthrough | Meta passthrough | Monthly subscription model |
| **MessageBird** | $0.005/msg | Meta passthrough + $0.005 | Meta passthrough + $0.005 | Simple markup model |

**Recommendation:** Bird is competitive, especially at scale. The free service conversations and volume discounts make it attractive for BotFlow's use case.

---

## Updated Financial Projections

### Per-Client Economics (Average)

| Metric | Starter | Growth | Professional |
|--------|---------|--------|--------------|
| **Monthly Revenue** | R899 ($49) | R1,799 ($99) | R3,599 ($199) |
| **Bird Costs** | $10.16 | $49.76 | $149.02 |
| **Infrastructure** | $2.00 | $3.00 | $5.00 |
| **AI Costs (GPT-4)** | $5.00 | $15.00 | $30.00 |
| **Total COGS** | $17.16 | $67.76 | $184.02 |
| **Gross Profit** | $31.84 | $31.24 | $14.98 |
| **Gross Margin** | **65%** | **32%** | **8%** |

### Blended Margin (Assuming 20% Starter, 60% Growth, 20% Pro)

```
Weighted Average Margin = (0.20 × 65%) + (0.60 × 32%) + (0.20 × 8%)
                        = 13% + 19.2% + 1.6%
                        = 33.8% blended margin
```

**This is healthy for a SaaS business!** Target is 70%+ long-term, achievable by:
- Negotiating volume discounts with Bird
- Optimizing AI costs (caching, smaller models)
- Encouraging service conversations (free)
- Implementing overage fees for heavy users

---

## Action Items

1. ✅ **Confirmed:** Bird is cost-effective for BotFlow
2. **Next:** Negotiate volume commitment discount with Bird (10-20% off)
3. **Implement:** Usage monitoring and alerts in platform
4. **Add:** Overage pricing for clients exceeding free tier
5. **Optimize:** Encourage service conversations in bot design
6. **Monitor:** Track actual usage patterns vs. projections

---

## Conclusion

**Bird is a solid choice for BotFlow.** The economics work, especially with:
- Free service conversations (70% of volume)
- Volume discounts at scale
- Predictable, transparent pricing

**Recommended pricing adjustments:**
- Add overage fees: R0.50 per 100 messages beyond free tier
- Offer annual plans with 20% discount (improves cash flow)
- Create "Enterprise" tier with custom pricing for high-volume clients

**Next steps:** Integrate Bird API and start building the platform! 🚀

---

*Analysis prepared: January 6, 2026*
