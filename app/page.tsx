'use client'

import { useState, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { getSchedule, getScheduleLogs, pauseSchedule, resumeSchedule, triggerScheduleNow, cronToHuman, listSchedules } from '@/lib/scheduler'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { HiRocketLaunch, HiCpuChip, HiCodeBracket, HiChartBar, HiUserGroup, HiBanknotes, HiCalendar, HiClock, HiArrowPath, HiPaperAirplane, HiClipboard, HiPhoto, HiNewspaper, HiCog6Tooth, HiChevronDown, HiChevronUp, HiCheckCircle, HiXCircle, HiPlayCircle, HiPauseCircle } from 'react-icons/hi2'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { Schedule, ExecutionLog } from '@/lib/scheduler'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGENT_IDS = {
  COORDINATOR: '6995671a8828565b3dd1fd5f',
  RESEARCH: '699566df52ed9064d46e1e06',
  WRITER: '699566df5cfd76433be5d3fa',
  IMAGE_GENERATOR: '6995671b52ed9064d46e1e08',
  SLACK_DELIVERY: '6995671baeb52a0abba6ec6d',
}

const SCHEDULE_ID = '69956727399dfadeac379a96'

const AGENTS_LIST = [
  { id: AGENT_IDS.COORDINATOR, name: 'AI Digest Coordinator', role: 'Manager -- Orchestrates workflow' },
  { id: AGENT_IDS.RESEARCH, name: 'AI Trend Research Agent', role: 'Sub-agent -- Researches trends' },
  { id: AGENT_IDS.WRITER, name: 'LinkedIn Content Writer', role: 'Sub-agent -- Writes posts' },
  { id: AGENT_IDS.IMAGE_GENERATOR, name: 'Branded Image Generator', role: 'Independent -- Creates images' },
  { id: AGENT_IDS.SLACK_DELIVERY, name: 'Slack Delivery Agent', role: 'Independent -- Sends to Slack' },
]

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface Story {
  headline: string
  summary: string
  source: string
  why_it_matters: string
}

interface CategoryData {
  stories: Story[]
  pattern: string
}

interface TwitterTrend {
  topic: string
  summary: string
  notable_voices: string
}

interface SuggestedTag {
  name: string
  title: string
  reason: string
}

interface DigestResponse {
  research_digest: {
    yc_startups: CategoryData
    new_models: CategoryData
    open_source: CategoryData
    benchmarks: CategoryData
    layoffs_hiring: CategoryData
    funding: CategoryData
  }
  twitter_trends: TwitterTrend[]
  linkedin_post: string
  character_count: number
  suggested_tags: SuggestedTag[]
  hashtags: string[]
  editors_note: string
  week_summary: string
}

interface ImageResponse {
  image_description: string
  design_notes: string
  alt_text: string
}

interface SlackResponse {
  delivery_status: string
  channel_name: string
  message_preview: string
  timestamp: string
}

interface HistoryEntry {
  id: string
  date: string
  weekRange: string
  week_summary: string
  linkedin_post_preview: string
  status: string
  digest: DigestResponse | null
  imageUrl: string | null
}

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------

const SAMPLE_DIGEST: DigestResponse = {
  research_digest: {
    yc_startups: {
      stories: [
        { headline: 'Cognition Labs raises $175M for AI coding agent Devin', summary: 'YC-backed Cognition Labs secured Series B funding to expand its autonomous software engineer Devin, which can handle complex coding tasks end-to-end.', source: 'TechCrunch', why_it_matters: 'Signals massive investor confidence in autonomous coding agents that could reshape software development workflows.' },
        { headline: 'Glean hits $4.6B valuation with enterprise AI search', summary: 'Glean, a YC alum, reached unicorn status with its AI-powered enterprise knowledge search platform serving Fortune 500 companies.', source: 'Forbes', why_it_matters: 'Enterprise AI search is becoming a must-have category, not a nice-to-have.' },
      ],
      pattern: 'YC startups are increasingly focusing on vertical AI agents that automate entire job functions rather than just assisting.'
    },
    new_models: {
      stories: [
        { headline: 'Google DeepMind unveils Gemini 2.5 Pro with enhanced reasoning', summary: 'Gemini 2.5 Pro introduces chain-of-thought reasoning and a 2M token context window, outperforming GPT-4o on multiple benchmarks.', source: 'Google Blog', why_it_matters: 'The reasoning model race intensifies as Google narrows the gap with OpenAI on complex problem-solving tasks.' },
        { headline: 'Anthropic releases Claude Opus 4 with extended thinking', summary: 'Claude Opus 4 features advanced extended thinking capabilities and improved tool use, setting new standards for agentic AI.', source: 'Anthropic Blog', why_it_matters: 'Extended thinking represents a paradigm shift from simple prompting to genuine multi-step reasoning.' },
      ],
      pattern: 'Frontier labs are converging on reasoning-first architectures with longer context windows.'
    },
    open_source: {
      stories: [
        { headline: 'Meta open-sources Llama 4 Scout and Maverick', summary: 'Meta released two new Llama 4 variants: Scout (17B active params, 16 experts) and Maverick (17B active, 128 experts) with competitive performance.', source: 'Meta AI Blog', why_it_matters: 'Open-source MoE models are closing the gap with proprietary systems, democratizing access to frontier capabilities.' },
      ],
      pattern: 'The open-source AI community is rapidly adopting mixture-of-experts architectures.'
    },
    benchmarks: {
      stories: [
        { headline: 'SWE-Bench Verified sees 50%+ solve rates for first time', summary: 'Multiple AI coding agents now solve over half of real-world GitHub issues in the SWE-Bench Verified benchmark.', source: 'SWE-Bench Leaderboard', why_it_matters: 'AI coding capabilities are approaching practical utility for production software maintenance.' },
      ],
      pattern: 'Benchmark saturation is accelerating, pushing the community toward harder, more realistic evaluations.'
    },
    layoffs_hiring: {
      stories: [
        { headline: 'AI safety teams see 40% headcount growth across major labs', summary: 'OpenAI, Anthropic, and Google DeepMind are aggressively hiring alignment and safety researchers as regulatory pressure mounts.', source: 'Bloomberg', why_it_matters: 'Safety hiring outpacing capability hiring signals a maturing industry taking responsible development seriously.' },
      ],
      pattern: 'The talent market is bifurcating: massive demand for AI safety and infrastructure roles, while traditional ML positions plateau.'
    },
    funding: {
      stories: [
        { headline: 'AI infrastructure startup CoreWeave valued at $35B', summary: 'GPU cloud provider CoreWeave raised $7.5B in its latest round, reflecting insatiable demand for AI compute infrastructure.', source: 'Reuters', why_it_matters: 'Infrastructure-layer companies are capturing enormous value as the AI compute shortage persists.' },
        { headline: 'Perplexity AI closes $500M round at $9B valuation', summary: 'AI search engine Perplexity continues its rapid ascent, positioning itself as a serious challenger to Google Search.', source: 'The Information', why_it_matters: 'AI-native search is no longer a novelty -- it is attracting the funding levels needed to compete with incumbents.' },
      ],
      pattern: 'Infrastructure and application-layer AI companies are both seeing record funding, but compute providers command the highest valuations.'
    },
  },
  twitter_trends: [
    { topic: 'Vibe Coding', summary: 'The term coined by Andrej Karpathy continues to dominate AI Twitter discourse, with developers sharing experiences of building entire apps through natural language.', notable_voices: 'Andrej Karpathy, Guillermo Rauch, Pieter Levels' },
    { topic: 'AI Agent Frameworks', summary: 'Heated debates about the best patterns for building multi-agent systems: LangGraph vs CrewAI vs custom orchestration.', notable_voices: 'Harrison Chase, Joao Moura, Letta team' },
    { topic: 'Context Window Wars', summary: 'Discussion around whether 1M+ token context windows actually improve performance or just add noise.', notable_voices: 'Yolanda Gil, Sebastian Raschka, AI researchers' },
  ],
  linkedin_post: "This Week in AI -- here is your Monday briefing.\n\nThe past 7 days delivered seismic shifts across the AI landscape. Here is what you need to know:\n\n-- FRONTIER MODELS --\nGemini 2.5 Pro and Claude Opus 4 both launched with reasoning-first architectures. The era of \"just predict the next token\" is officially over.\n\n-- OPEN SOURCE --\nMeta dropped Llama 4 Scout and Maverick. MoE architectures are going mainstream in the open-source world.\n\n-- FUNDING --\nCoreWeave hit $35B. Perplexity closed $500M. The message is clear: investors are doubling down on both infrastructure and applications.\n\n-- TALENT --\nAI safety teams grew 40% across major labs. Responsible development is no longer optional.\n\nThe big picture: We are entering the era of AI agents that reason, not just respond.\n\nWhat trend surprised you most this week?",
  character_count: 742,
  suggested_tags: [
    { name: '@satlovrr', title: 'AI Researcher', reason: 'Frequently comments on frontier model developments' },
    { name: '@kaborali', title: 'Tech VC', reason: 'Actively tracks AI funding rounds' },
    { name: '@saborwrites', title: 'AI Safety Advocate', reason: 'Covers AI safety hiring and policy trends' },
  ],
  hashtags: ['#AI', '#ArtificialIntelligence', '#MachineLearning', '#ThisWeekInAI', '#AIAgents', '#LLMs'],
  editors_note: 'This week marks a clear inflection point: reasoning models are becoming the new baseline, open-source is closing the gap faster than expected, and the talent market is shifting decisively toward safety and infrastructure roles. Keep your eyes on the agent framework space -- it is about to get very competitive.',
  week_summary: 'A landmark week featuring new frontier models from Google and Anthropic, Meta open-sourcing Llama 4, record AI infrastructure funding, and accelerating AI safety hiring across major labs.',
}

// ---------------------------------------------------------------------------
// Response Extraction Helpers
// ---------------------------------------------------------------------------

/**
 * Robustly extract digest data from a potentially nested API response.
 * The Lyzr API + parseLLMJson + normalizeResponse chain can place data
 * at various nesting levels. This function searches for the actual
 * DigestResponse shape (has research_digest or linkedin_post) no matter
 * how deeply it's wrapped.
 */
function extractDigestData(raw: any): DigestResponse | null {
  if (!raw || typeof raw !== 'object') return null

  // Direct match — raw IS the digest
  if (raw.research_digest || raw.linkedin_post) {
    return raw as DigestResponse
  }

  // Check common wrapper keys
  const wrapperKeys = ['result', 'response', 'data', 'output', 'content', 'message']
  for (const key of wrapperKeys) {
    if (raw[key] && typeof raw[key] === 'object') {
      const found = extractDigestData(raw[key])
      if (found) return found
    }
    // Handle stringified JSON inside a key
    if (raw[key] && typeof raw[key] === 'string') {
      try {
        const parsed = JSON.parse(raw[key])
        const found = extractDigestData(parsed)
        if (found) return found
      } catch { /* not JSON, skip */ }
    }
  }

  return null
}

/**
 * Extract image artifact files from a potentially nested response
 */
function extractImageFiles(result: any): { file_url: string; name: string; format_type: string }[] {
  if (!result) return []
  // Top-level module_outputs (expected path)
  const topLevel = result?.module_outputs?.artifact_files
  if (Array.isArray(topLevel) && topLevel.length > 0) return topLevel
  // Inside response
  const nested = result?.response?.module_outputs?.artifact_files
  if (Array.isArray(nested) && nested.length > 0) return nested
  return []
}

/**
 * Extract Slack delivery data from response
 */
function extractSlackData(raw: any): SlackResponse | null {
  if (!raw || typeof raw !== 'object') return null
  if (raw.delivery_status) return raw as SlackResponse
  const wrapperKeys = ['result', 'response', 'data']
  for (const key of wrapperKeys) {
    if (raw[key] && typeof raw[key] === 'object') {
      const found = extractSlackData(raw[key])
      if (found) return found
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

function getWeekRange(): string {
  const now = new Date()
  const start = startOfWeek(now, { weekStartsOn: 1 })
  const end = endOfWeek(now, { weekStartsOn: 1 })
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
}

type CategoryKey = 'yc_startups' | 'new_models' | 'open_source' | 'benchmarks' | 'layoffs_hiring' | 'funding'

interface CategoryMeta {
  key: CategoryKey
  label: string
  icon: React.ReactNode
}

const CATEGORIES: CategoryMeta[] = [
  { key: 'yc_startups', label: 'YC Startups', icon: <HiRocketLaunch className="w-5 h-5" /> },
  { key: 'new_models', label: 'New Models', icon: <HiCpuChip className="w-5 h-5" /> },
  { key: 'open_source', label: 'Open Source', icon: <HiCodeBracket className="w-5 h-5" /> },
  { key: 'benchmarks', label: 'Benchmarks', icon: <HiChartBar className="w-5 h-5" /> },
  { key: 'layoffs_hiring', label: 'Layoffs / Hiring', icon: <HiUserGroup className="w-5 h-5" /> },
  { key: 'funding', label: 'Funding', icon: <HiBanknotes className="w-5 h-5" /> },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBanner({ message, type }: { message: string; type: 'success' | 'error' | 'info' }) {
  if (!message) return null
  const colors = {
    success: 'bg-green-900/30 border-green-700/40 text-green-300',
    error: 'bg-red-900/30 border-red-700/40 text-red-300',
    info: 'bg-accent/20 border-accent/30 text-accent-foreground',
  }
  return (
    <div className={`px-4 py-2.5 rounded-lg border text-sm flex items-center gap-2 ${colors[type]}`}>
      {type === 'success' && <HiCheckCircle className="w-4 h-4 flex-shrink-0" />}
      {type === 'error' && <HiXCircle className="w-4 h-4 flex-shrink-0" />}
      {type === 'info' && <HiArrowPath className="w-4 h-4 flex-shrink-0 animate-spin" />}
      <span>{message}</span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <Card key={n} className="bg-card border-border shadow-lg">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

function CategoryCard({ meta, data, expanded, onToggle }: { meta: CategoryMeta; data: CategoryData | undefined; expanded: boolean; onToggle: () => void }) {
  const stories = Array.isArray(data?.stories) ? data.stories : []
  const pattern = data?.pattern ?? ''

  return (
    <Card className="bg-card border-border shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-accent/20 text-accent">{meta.icon}</div>
            <div>
              <CardTitle className="text-sm font-semibold text-card-foreground">{meta.label}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{stories.length} {stories.length === 1 ? 'story' : 'stories'}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onToggle} className="text-muted-foreground hover:text-foreground">
            {expanded ? <HiChevronUp className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {pattern && (
          <p className="text-xs text-muted-foreground italic border-l-2 border-accent/40 pl-3 mb-3">{pattern}</p>
        )}
        {expanded && stories.length > 0 && (
          <div className="space-y-3 mt-2">
            {stories.map((story, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-secondary/50 border border-border/50">
                <h4 className="font-semibold text-sm text-card-foreground mb-1">{story?.headline ?? 'Untitled'}</h4>
                <p className="text-xs text-muted-foreground mb-2">{story?.summary ?? ''}</p>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs border-accent/30 text-accent">{story?.source ?? 'Unknown'}</Badge>
                  {story?.why_it_matters && (
                    <p className="text-xs text-accent/80 italic flex-1 min-w-0">Why it matters: {story.why_it_matters}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {expanded && stories.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No stories available for this category.</p>
        )}
      </CardContent>
    </Card>
  )
}

function TwitterTrendsSection({ trends }: { trends: TwitterTrend[] }) {
  const safeTrends = Array.isArray(trends) ? trends : []
  if (safeTrends.length === 0) return null

  return (
    <Card className="bg-card border-border shadow-lg">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <HiNewspaper className="w-5 h-5 text-accent" />
          X / Twitter Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {safeTrends.map((trend, idx) => (
            <div key={idx} className="p-4 rounded-lg bg-secondary/50 border border-border/50">
              <h4 className="font-semibold text-sm text-card-foreground mb-1.5">{trend?.topic ?? 'Topic'}</h4>
              <p className="text-xs text-muted-foreground mb-2">{trend?.summary ?? ''}</p>
              {trend?.notable_voices && (
                <p className="text-xs text-accent/80">
                  <span className="font-medium">Notable voices:</span> {trend.notable_voices}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function LinkedInEditor({ post, onPostChange, tags, hashtags, characterCount, onCopy, copyStatus }: {
  post: string
  onPostChange: (val: string) => void
  tags: SuggestedTag[]
  hashtags: string[]
  characterCount: number
  onCopy: () => void
  copyStatus: string
}) {
  const safeTags = Array.isArray(tags) ? tags : []
  const safeHashtags = Array.isArray(hashtags) ? hashtags : []
  const charCount = post?.length ?? characterCount ?? 0

  return (
    <Card className="bg-card border-border shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">LinkedIn Post Editor</CardTitle>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium ${charCount > 3000 ? 'text-red-400' : 'text-muted-foreground'}`}>
              {charCount} / 3000 chars
            </span>
            <Button variant="outline" size="sm" onClick={onCopy} className="border-accent/30 hover:bg-accent/10 text-sm">
              <HiClipboard className="w-4 h-4 mr-1.5" />
              {copyStatus || 'Copy'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={post ?? ''}
          onChange={(e) => onPostChange(e.target.value)}
          rows={12}
          className="bg-secondary/30 border-border text-foreground text-sm font-normal resize-y"
          placeholder="LinkedIn post will appear here after digest generation..."
        />
        {safeTags.length > 0 && (
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Suggested Tags</Label>
            <div className="flex flex-wrap gap-2">
              {safeTags.map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="cursor-pointer hover:bg-accent/20 transition-colors text-xs" title={`${tag?.title ?? ''} -- ${tag?.reason ?? ''}`}>
                  {tag?.name ?? 'Unknown'}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {safeHashtags.length > 0 && (
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Hashtags</Label>
            <div className="flex flex-wrap gap-2">
              {safeHashtags.map((ht, idx) => (
                <Badge key={idx} className="bg-accent/20 text-accent border-accent/30 text-xs">{ht ?? ''}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ImageSection({ imageUrl, imageData, loading, onGenerate, statusMsg }: {
  imageUrl: string
  imageData: ImageResponse | null
  loading: boolean
  onGenerate: () => void
  statusMsg: string
}) {
  return (
    <Card className="bg-card border-border shadow-lg">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <HiPhoto className="w-5 h-5 text-accent" />
          Branded Image
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {statusMsg && <StatusBanner message={statusMsg} type={loading ? 'info' : (statusMsg.toLowerCase().includes('error') || statusMsg.toLowerCase().includes('fail') ? 'error' : 'success')} />}
        {imageUrl ? (
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden border border-border">
              <img src={imageUrl} alt={imageData?.alt_text ?? 'Generated branded image'} className="w-full h-auto max-h-96 object-contain bg-secondary/20" />
            </div>
            {imageData?.image_description && (
              <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Description:</span> {imageData.image_description}</p>
            )}
            {imageData?.design_notes && (
              <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Design Notes:</span> {imageData.design_notes}</p>
            )}
            {imageData?.alt_text && (
              <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Alt Text:</span> {imageData.alt_text}</p>
            )}
            <Button variant="outline" size="sm" onClick={onGenerate} disabled={loading} className="border-accent/30 hover:bg-accent/10">
              <HiArrowPath className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <HiPhoto className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Generate a branded image for this week's digest</p>
            <Button onClick={onGenerate} disabled={loading} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {loading ? <HiArrowPath className="w-4 h-4 mr-1.5 animate-spin" /> : <HiPhoto className="w-4 h-4 mr-1.5" />}
              {loading ? 'Generating...' : 'Generate Image'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SlackSection({ onSend, loading, statusMsg, slackChannel, onChannelChange, hasDigest }: {
  onSend: () => void
  loading: boolean
  statusMsg: string
  slackChannel: string
  onChannelChange: (val: string) => void
  hasDigest: boolean
}) {
  return (
    <Card className="bg-card border-border shadow-lg">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <HiPaperAirplane className="w-5 h-5 text-accent" />
          Slack Delivery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {statusMsg && <StatusBanner message={statusMsg} type={loading ? 'info' : (statusMsg.toLowerCase().includes('error') || statusMsg.toLowerCase().includes('fail') ? 'error' : 'success')} />}
        <div>
          <Label htmlFor="slack-channel" className="text-xs text-muted-foreground">Channel Name</Label>
          <Input
            id="slack-channel"
            placeholder="#ai-weekly-digest"
            value={slackChannel}
            onChange={(e) => onChannelChange(e.target.value)}
            className="mt-1.5 bg-secondary/30 border-border"
          />
        </div>
        <Button onClick={onSend} disabled={loading || !hasDigest || !slackChannel.trim()} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {loading ? <HiArrowPath className="w-4 h-4 mr-1.5 animate-spin" /> : <HiPaperAirplane className="w-4 h-4 mr-1.5" />}
          {loading ? 'Sending...' : 'Send to Slack'}
        </Button>
        {!hasDigest && <p className="text-xs text-muted-foreground italic">Generate a digest first before sending to Slack.</p>}
      </CardContent>
    </Card>
  )
}

function EditorsNote({ note }: { note: string }) {
  if (!note) return null
  return (
    <Card className="bg-card border-border shadow-lg border-l-4 border-l-accent">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-accent">Editor's Note</CardTitle>
      </CardHeader>
      <CardContent>
        {renderMarkdown(note)}
      </CardContent>
    </Card>
  )
}

function HistoryScreen({ history, onSelect }: { history: HistoryEntry[]; onSelect: (entry: HistoryEntry) => void }) {
  if (history.length === 0) {
    return (
      <div className="text-center py-16">
        <HiClock className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No History Yet</h3>
        <p className="text-sm text-muted-foreground">Generated digests will appear here for future reference.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Digest History</h2>
      <div className="space-y-3">
        {history.map((entry) => (
          <Card key={entry.id} className="bg-card border-border shadow-lg cursor-pointer hover:border-accent/40 transition-colors" onClick={() => onSelect(entry)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HiCalendar className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">{entry.weekRange}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={entry.status === 'sent' ? 'default' : 'secondary'} className={entry.status === 'sent' ? 'bg-green-800/40 text-green-300 border-green-700/30' : ''}>
                    {entry.status === 'sent' ? 'Sent' : 'Generated'}
                  </Badge>
                  {entry.imageUrl && <Badge variant="outline" className="text-xs border-accent/30 text-accent">Has Image</Badge>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{entry.date}</p>
              <p className="text-sm text-foreground/80 line-clamp-2">{entry.week_summary || 'No summary available'}</p>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{entry.linkedin_post_preview || ''}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function SettingsScreen({ schedule, scheduleLogs, scheduleLoading, scheduleError, onToggleSchedule, onTriggerNow, onRefreshSchedule, slackDefault, onSlackDefaultChange }: {
  schedule: Schedule | null
  scheduleLogs: ExecutionLog[]
  scheduleLoading: boolean
  scheduleError: string
  onToggleSchedule: () => void
  onTriggerNow: () => void
  onRefreshSchedule: () => void
  slackDefault: string
  onSlackDefaultChange: (val: string) => void
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Settings</h2>

      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <HiCalendar className="w-5 h-5 text-accent" />
            Schedule Management
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs">Manage the automated weekly digest schedule</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {scheduleError && <StatusBanner message={scheduleError} type="error" />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <div className="flex items-center gap-2">
                {schedule?.is_active ? (
                  <><HiCheckCircle className="w-4 h-4 text-green-400" /><span className="text-sm font-medium text-green-400">Active</span></>
                ) : (
                  <><HiPauseCircle className="w-4 h-4 text-yellow-400" /><span className="text-sm font-medium text-yellow-400">Paused</span></>
                )}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Schedule</p>
              <p className="text-sm font-medium text-foreground">
                {schedule?.cron_expression ? cronToHuman(schedule.cron_expression) : 'Every Monday at 10:00'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{schedule?.timezone ?? 'Asia/Kolkata'}</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Next Run</p>
              <p className="text-sm font-medium text-foreground">
                {schedule?.next_run_time ? format(new Date(schedule.next_run_time), 'MMM d, yyyy HH:mm') : 'N/A'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Last Run</p>
              <p className="text-sm font-medium text-foreground">
                {schedule?.last_run_at ? format(new Date(schedule.last_run_at), 'MMM d, yyyy HH:mm') : 'Never'}
              </p>
              {schedule?.last_run_success !== null && schedule?.last_run_success !== undefined && (
                <p className={`text-xs mt-0.5 ${schedule.last_run_success ? 'text-green-400' : 'text-red-400'}`}>
                  {schedule.last_run_success ? 'Succeeded' : 'Failed'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" onClick={onToggleSchedule} disabled={scheduleLoading} className="border-accent/30 hover:bg-accent/10">
              {schedule?.is_active ? (
                <><HiPauseCircle className="w-4 h-4 mr-1.5" />Pause Schedule</>
              ) : (
                <><HiPlayCircle className="w-4 h-4 mr-1.5" />Resume Schedule</>
              )}
            </Button>
            <Button variant="outline" onClick={onTriggerNow} disabled={scheduleLoading} className="border-accent/30 hover:bg-accent/10">
              <HiArrowPath className={`w-4 h-4 mr-1.5 ${scheduleLoading ? 'animate-spin' : ''}`} />
              Run Now
            </Button>
            <Button variant="ghost" size="sm" onClick={onRefreshSchedule} disabled={scheduleLoading} className="text-muted-foreground hover:text-foreground">
              <HiArrowPath className={`w-4 h-4 ${scheduleLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {scheduleLogs.length > 0 && (
            <div>
              <Separator className="mb-4" />
              <h4 className="text-sm font-semibold mb-3 text-foreground">Recent Execution Logs</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {scheduleLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50 text-xs">
                    <div className="flex items-center gap-2">
                      {log.success ? <HiCheckCircle className="w-3.5 h-3.5 text-green-400" /> : <HiXCircle className="w-3.5 h-3.5 text-red-400" />}
                      <span className="text-muted-foreground">{log.executed_at ? format(new Date(log.executed_at), 'MMM d, HH:mm:ss') : 'Unknown'}</span>
                    </div>
                    <span className={log.success ? 'text-green-400' : 'text-red-400'}>{log.success ? 'Success' : log.error_message ?? 'Failed'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <HiPaperAirplane className="w-5 h-5 text-accent" />
            Slack Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="default-channel" className="text-xs text-muted-foreground">Default Channel</Label>
            <Input
              id="default-channel"
              placeholder="#ai-weekly-digest"
              value={slackDefault}
              onChange={(e) => onSlackDefaultChange(e.target.value)}
              className="mt-1.5 bg-secondary/30 border-border"
            />
          </div>
          <p className="text-xs text-muted-foreground italic">This channel will be pre-filled when sending digests to Slack.</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Agent Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {AGENTS_LIST.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border/50 text-xs">
                <div>
                  <span className="font-medium text-foreground">{agent.name}</span>
                  <span className="text-muted-foreground ml-2">{agent.role}</span>
                </div>
                <Badge variant="outline" className="text-[10px] border-accent/20 text-muted-foreground font-mono">{agent.id.slice(0, 8)}...</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function Page() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard')

  // Digest state
  const [digest, setDigest] = useState<DigestResponse | null>(null)
  const [digestLoading, setDigestLoading] = useState(false)
  const [digestStatus, setDigestStatus] = useState('')
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // LinkedIn editor
  const [linkedinPost, setLinkedinPost] = useState('')
  const [copyStatus, setCopyStatus] = useState('')

  // Image
  const [imageUrl, setImageUrl] = useState('')
  const [imageData, setImageData] = useState<ImageResponse | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageStatus, setImageStatus] = useState('')

  // Slack
  const [slackChannel, setSlackChannel] = useState('')
  const [slackLoading, setSlackLoading] = useState(false)
  const [slackStatus, setSlackStatus] = useState('')

  // Category expansion
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  // Sample data toggle
  const [showSampleData, setShowSampleData] = useState(false)
  const [isSampleData, setIsSampleData] = useState(false)

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [selectedHistory, setSelectedHistory] = useState<HistoryEntry | null>(null)

  // Schedule
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [scheduleLogs, setScheduleLogs] = useState<ExecutionLog[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleError, setScheduleError] = useState('')

  // Slack default
  const [slackDefault, setSlackDefault] = useState('')

  // Week range
  const [weekRange, setWeekRange] = useState('')

  // Initialize
  useEffect(() => {
    setWeekRange(getWeekRange())

    // Load history from localStorage
    try {
      const saved = localStorage.getItem('twiai_history')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) setHistory(parsed)
      }
    } catch { /* ignore */ }

    // Load default slack channel
    try {
      const savedChannel = localStorage.getItem('twiai_slack_default')
      if (savedChannel) {
        setSlackDefault(savedChannel)
        setSlackChannel(savedChannel)
      }
    } catch { /* ignore */ }
  }, [])

  // Load schedule data
  const loadSchedule = useCallback(async () => {
    setScheduleLoading(true)
    setScheduleError('')
    try {
      const res = await getSchedule(SCHEDULE_ID)
      if (res.success && res.schedule) {
        setSchedule(res.schedule)
      } else {
        setScheduleError(res.error ?? 'Failed to load schedule')
      }
      const logsRes = await getScheduleLogs(SCHEDULE_ID, { limit: 10 })
      if (logsRes.success) {
        setScheduleLogs(Array.isArray(logsRes.executions) ? logsRes.executions : [])
      }
    } catch {
      setScheduleError('Failed to load schedule data')
    }
    setScheduleLoading(false)
  }, [])

  useEffect(() => {
    if (activeTab === 'settings') {
      loadSchedule()
    }
  }, [activeTab, loadSchedule])

  // Sample data effect
  useEffect(() => {
    if (showSampleData && !digest) {
      setDigest(SAMPLE_DIGEST)
      setLinkedinPost(SAMPLE_DIGEST.linkedin_post)
      setExpandedCategories({ yc_startups: true, new_models: true })
      setIsSampleData(true)
    } else if (!showSampleData && isSampleData) {
      setDigest(null)
      setLinkedinPost('')
      setExpandedCategories({})
      setIsSampleData(false)
      setDigestStatus('')
    }
  }, [showSampleData, digest, isSampleData])

  // Save slack default
  const handleSlackDefaultChange = (val: string) => {
    setSlackDefault(val)
    try { localStorage.setItem('twiai_slack_default', val) } catch { /* ignore */ }
  }

  // Generate digest
  const handleGenerateDigest = async () => {
    setDigestLoading(true)
    setDigestStatus('Generating weekly AI digest... This may take a minute.')
    setActiveAgentId(AGENT_IDS.COORDINATOR)
    setIsSampleData(false)
    try {
      const result = await callAIAgent(
        'Generate this week\'s AI intelligence digest covering YC startups, new models, open source developments, benchmarks, layoffs/hiring trends, and funding rounds. Include Twitter/X trends and write a LinkedIn post.',
        AGENT_IDS.COORDINATOR
      )

      if (result.success) {
        // Use robust extraction to find the digest data at any nesting level
        const directResult = result?.response?.result
        const data = extractDigestData(directResult) || extractDigestData(result?.response) || extractDigestData(result)

        if (data && (data.research_digest || data.linkedin_post)) {
          setDigest(data)
          setLinkedinPost(data?.linkedin_post ?? '')
          setDigestStatus('Digest generated successfully!')
          setExpandedCategories({ yc_startups: true })

          // Save to history
          const entry: HistoryEntry = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            weekRange: weekRange,
            week_summary: data?.week_summary ?? '',
            linkedin_post_preview: (data?.linkedin_post ?? '').slice(0, 150),
            status: 'generated',
            digest: data,
            imageUrl: null,
          }
          const newHistory = [entry, ...history]
          setHistory(newHistory)
          try { localStorage.setItem('twiai_history', JSON.stringify(newHistory)) } catch { /* ignore */ }
        } else {
          // Try to show what we got so the user can see the raw output
          const rawMessage = result?.response?.message || result?.raw_response || ''
          if (typeof rawMessage === 'string' && rawMessage.length > 0) {
            setDigestStatus('Digest received but could not parse structured data. Showing raw output.')
            // Create a minimal digest with the raw text as linkedin_post for visibility
            setLinkedinPost(rawMessage.slice(0, 3000))
          } else {
            setDigestStatus('Digest generated but response format was unexpected. Please try again.')
          }
        }
      } else {
        setDigestStatus(`Error: ${result?.error ?? result?.response?.message ?? 'Failed to generate digest. Please try again.'}`)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      if (errorMsg.toLowerCase().includes('failed to fetch') || errorMsg.toLowerCase().includes('network')) {
        setDigestStatus('Network error: The request may have timed out. Manager agents can take 1-2 minutes. Please try again.')
      } else {
        setDigestStatus(`Error: ${errorMsg}`)
      }
    }
    setDigestLoading(false)
    setActiveAgentId(null)
  }

  // Generate image
  const handleGenerateImage = async () => {
    setImageLoading(true)
    setImageStatus('Generating branded image...')
    setActiveAgentId(AGENT_IDS.IMAGE_GENERATOR)
    try {
      const summary = digest?.week_summary ?? 'This Week in AI digest'
      const highlights = digest?.research_digest
        ? Object.values(digest.research_digest)
            .flatMap((cat: any) => Array.isArray(cat?.stories) ? cat.stories.map((s: any) => s?.headline).filter(Boolean) : [])
            .slice(0, 3)
            .join('; ')
        : ''
      const prompt = `Generate a professional "This Week in AI" branded image with Lyzr brown color palette. Key highlights: ${summary}. ${highlights ? `Top headlines: ${highlights}` : ''}`
      const result = await callAIAgent(prompt, AGENT_IDS.IMAGE_GENERATOR)

      if (result.success) {
        const data = result?.response?.result
        if (data && typeof data === 'object') setImageData(data as ImageResponse)

        // Use robust extraction for image files
        const files = extractImageFiles(result)
        if (files.length > 0 && files[0]?.file_url) {
          setImageUrl(files[0].file_url)
          setImageStatus('Image generated successfully!')

          // Update last history entry
          if (history.length > 0) {
            const updatedHistory = [...history]
            updatedHistory[0] = { ...updatedHistory[0], imageUrl: files[0].file_url }
            setHistory(updatedHistory)
            try { localStorage.setItem('twiai_history', JSON.stringify(updatedHistory)) } catch { /* ignore */ }
          }
        } else {
          setImageStatus('Image agent responded but no image file was returned.')
        }
      } else {
        setImageStatus(`Error: ${result?.error ?? 'Failed to generate image'}`)
      }
    } catch (err) {
      setImageStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    setImageLoading(false)
    setActiveAgentId(null)
  }

  // Send to Slack
  const handleSendToSlack = async () => {
    if (!slackChannel.trim()) return
    setSlackLoading(true)
    setSlackStatus('Sending digest to Slack...')
    setActiveAgentId(AGENT_IDS.SLACK_DELIVERY)
    try {
      const content = linkedinPost || digest?.linkedin_post || ''
      const weekSummary = digest?.week_summary || ''
      const message = `Send the following AI weekly digest to Slack channel "${slackChannel}".

Content to post:
---
${weekSummary ? `Summary: ${weekSummary}\n\n` : ''}LinkedIn Post:
${content}
---

Post this content to the channel "${slackChannel}" using SLACK_CHAT_POST_MESSAGE.`

      const result = await callAIAgent(message, AGENT_IDS.SLACK_DELIVERY)
      if (result.success) {
        const data = extractSlackData(result?.response?.result) || extractSlackData(result?.response) || extractSlackData(result)
        const statusText = data?.delivery_status ?? 'sent'
        const channel = data?.channel_name ?? slackChannel
        const ts = data?.timestamp ?? ''
        setSlackStatus(`Delivered to ${channel} -- Status: ${statusText}${ts ? ` at ${ts}` : ''}`)

        // Update history
        if (history.length > 0) {
          const updatedHistory = [...history]
          updatedHistory[0] = { ...updatedHistory[0], status: 'sent' }
          setHistory(updatedHistory)
          try { localStorage.setItem('twiai_history', JSON.stringify(updatedHistory)) } catch { /* ignore */ }
        }
      } else {
        setSlackStatus(`Error: ${result?.error ?? 'Failed to send to Slack'}`)
      }
    } catch (err) {
      setSlackStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    setSlackLoading(false)
    setActiveAgentId(null)
  }

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(linkedinPost || '')
      setCopyStatus('Copied!')
      setTimeout(() => setCopyStatus(''), 2000)
    } catch {
      setCopyStatus('Failed')
      setTimeout(() => setCopyStatus(''), 2000)
    }
  }

  // Toggle category
  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Schedule actions
  const handleToggleSchedule = async () => {
    if (!schedule) return
    setScheduleLoading(true)
    setScheduleError('')
    try {
      if (schedule.is_active) {
        await pauseSchedule(SCHEDULE_ID)
      } else {
        await resumeSchedule(SCHEDULE_ID)
      }
      // Always refresh from list to sync
      const listRes = await listSchedules()
      if (listRes.success) {
        const found = listRes.schedules.find(s => s.id === SCHEDULE_ID)
        if (found) setSchedule(found)
      }
    } catch {
      setScheduleError('Failed to toggle schedule')
    }
    setScheduleLoading(false)
  }

  const handleTriggerNow = async () => {
    setScheduleLoading(true)
    setScheduleError('')
    try {
      const res = await triggerScheduleNow(SCHEDULE_ID)
      if (!res.success) {
        setScheduleError(res.error ?? 'Failed to trigger schedule')
      }
    } catch {
      setScheduleError('Failed to trigger schedule')
    }
    setScheduleLoading(false)
  }

  // History select
  const handleHistorySelect = (entry: HistoryEntry) => {
    if (entry.digest) {
      setDigest(entry.digest)
      setLinkedinPost(entry.digest?.linkedin_post ?? '')
      setImageUrl(entry.imageUrl ?? '')
      setActiveTab('dashboard')
    }
    setSelectedHistory(entry)
  }

  // Current display data
  const displayDigest = digest
  const isAnyLoading = digestLoading || imageLoading || slackLoading

  // Sidebar nav items
  const navItems = [
    { key: 'dashboard' as const, label: 'Dashboard', icon: <HiNewspaper className="w-5 h-5" /> },
    { key: 'history' as const, label: 'History', icon: <HiClock className="w-5 h-5" /> },
    { key: 'settings' as const, label: 'Settings', icon: <HiCog6Tooth className="w-5 h-5" /> },
  ]

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-card border-r border-border flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-border">
          <h1 className="text-lg font-bold text-foreground tracking-tight">This Week in AI</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider uppercase">Powered by Lyzr</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === item.key ? 'bg-accent/20 text-accent' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Active Agent Indicator */}
        <div className="p-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Agent Status</p>
          <div className="space-y-1.5">
            {AGENTS_LIST.map((agent) => (
              <div key={agent.id} className="flex items-center gap-2 text-xs">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeAgentId === agent.id ? 'bg-green-400 animate-pulse' : 'bg-muted-foreground/30'}`} />
                <span className={`truncate ${activeAgentId === agent.id ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {agent.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 flex-shrink-0 border-b border-border bg-card flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-foreground">
              {activeTab === 'dashboard' && `Weekly Digest -- ${weekRange}`}
              {activeTab === 'history' && 'Digest History'}
              {activeTab === 'settings' && 'Settings'}
            </h2>
            {activeTab === 'dashboard' && displayDigest && (
              <Badge className="bg-green-800/30 text-green-300 border-green-700/30 text-xs">Generated</Badge>
            )}
            {activeTab === 'dashboard' && digestLoading && (
              <Badge className="bg-accent/20 text-accent border-accent/30 text-xs">Generating...</Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
            <Switch
              id="sample-toggle"
              checked={showSampleData}
              onCheckedChange={setShowSampleData}
            />
          </div>
        </header>

        {/* Content Area */}
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Dashboard */}
            {activeTab === 'dashboard' && (
              <>
                {/* Status Banner */}
                {digestStatus && (
                  <StatusBanner
                    message={digestStatus}
                    type={digestLoading ? 'info' : (digestStatus.toLowerCase().includes('error') ? 'error' : 'success')}
                  />
                )}

                {/* Action Bar — Generate CTA */}
                {!displayDigest && !digestLoading && (
                  <Card className="bg-card border-border shadow-lg">
                    <CardContent className="p-8 text-center">
                      <HiNewspaper className="w-16 h-16 mx-auto text-accent/30 mb-4" />
                      <h3 className="text-xl font-semibold text-foreground mb-2">Generate Your Weekly AI Digest</h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-lg mx-auto">
                        The coordinator agent will research this week's AI news across 6 categories, identify X/Twitter trends, and write a LinkedIn post -- all in one click.
                      </p>
                      <Button onClick={handleGenerateDigest} disabled={digestLoading} className="bg-accent text-accent-foreground hover:bg-accent/90 px-8 py-2.5">
                        <HiArrowPath className={`w-4 h-4 mr-2 ${digestLoading ? 'animate-spin' : ''}`} />
                        Generate Digest
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Show raw linkedin post if we got text but couldn't parse structured data */}
                {!displayDigest && !digestLoading && linkedinPost && (
                  <Card className="bg-card border-border shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">Agent Response (Raw)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={linkedinPost}
                        onChange={(e) => setLinkedinPost(e.target.value)}
                        rows={10}
                        className="bg-secondary/30 border-border text-foreground text-sm resize-y"
                      />
                      <Button variant="outline" size="sm" onClick={handleCopy} className="mt-3 border-accent/30 hover:bg-accent/10">
                        <HiClipboard className="w-4 h-4 mr-1.5" />
                        {copyStatus || 'Copy'}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {digestLoading && <LoadingSkeleton />}

                {displayDigest && !digestLoading && (
                  <>
                    {/* Week Summary */}
                    {displayDigest?.week_summary && (
                      <Card className="bg-card border-border shadow-lg">
                        <CardContent className="p-5">
                          <p className="text-sm text-foreground/90">{displayDigest.week_summary}</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <Button onClick={handleGenerateDigest} disabled={isAnyLoading} variant="outline" className="border-accent/30 hover:bg-accent/10">
                        <HiArrowPath className={`w-4 h-4 mr-1.5 ${digestLoading ? 'animate-spin' : ''}`} />
                        Regenerate Digest
                      </Button>
                      <Button onClick={handleGenerateImage} disabled={isAnyLoading} variant="outline" className="border-accent/30 hover:bg-accent/10">
                        <HiPhoto className={`w-4 h-4 mr-1.5 ${imageLoading ? 'animate-spin' : ''}`} />
                        {imageUrl ? 'Regenerate Image' : 'Generate Image'}
                      </Button>
                      <Button onClick={handleSendToSlack} disabled={isAnyLoading || !slackChannel.trim()} variant="outline" className="border-accent/30 hover:bg-accent/10">
                        <HiPaperAirplane className={`w-4 h-4 mr-1.5 ${slackLoading ? 'animate-spin' : ''}`} />
                        Send to Slack
                      </Button>
                    </div>

                    {/* Category Cards Grid */}
                    <div>
                      <h3 className="text-base font-semibold text-foreground mb-3">Research Digest</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {CATEGORIES.map((cat) => {
                          const catData = displayDigest?.research_digest?.[cat.key] as CategoryData | undefined
                          return (
                            <CategoryCard
                              key={cat.key}
                              meta={cat}
                              data={catData}
                              expanded={!!expandedCategories[cat.key]}
                              onToggle={() => toggleCategory(cat.key)}
                            />
                          )
                        })}
                      </div>
                    </div>

                    {/* Twitter Trends */}
                    <TwitterTrendsSection trends={displayDigest?.twitter_trends ?? []} />

                    {/* LinkedIn Editor */}
                    <LinkedInEditor
                      post={linkedinPost}
                      onPostChange={setLinkedinPost}
                      tags={Array.isArray(displayDigest?.suggested_tags) ? displayDigest.suggested_tags : []}
                      hashtags={Array.isArray(displayDigest?.hashtags) ? displayDigest.hashtags : []}
                      characterCount={displayDigest?.character_count ?? 0}
                      onCopy={handleCopy}
                      copyStatus={copyStatus}
                    />

                    {/* Image Section */}
                    <ImageSection
                      imageUrl={imageUrl}
                      imageData={imageData}
                      loading={imageLoading}
                      onGenerate={handleGenerateImage}
                      statusMsg={imageStatus}
                    />

                    {/* Slack Section */}
                    <SlackSection
                      onSend={handleSendToSlack}
                      loading={slackLoading}
                      statusMsg={slackStatus}
                      slackChannel={slackChannel}
                      onChannelChange={setSlackChannel}
                      hasDigest={!!displayDigest}
                    />

                    {/* Editor's Note */}
                    <EditorsNote note={displayDigest?.editors_note ?? ''} />
                  </>
                )}
              </>
            )}

            {/* History */}
            {activeTab === 'history' && (
              <HistoryScreen history={history} onSelect={handleHistorySelect} />
            )}

            {/* Settings */}
            {activeTab === 'settings' && (
              <SettingsScreen
                schedule={schedule}
                scheduleLogs={scheduleLogs}
                scheduleLoading={scheduleLoading}
                scheduleError={scheduleError}
                onToggleSchedule={handleToggleSchedule}
                onTriggerNow={handleTriggerNow}
                onRefreshSchedule={loadSchedule}
                slackDefault={slackDefault}
                onSlackDefaultChange={handleSlackDefaultChange}
              />
            )}
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}
