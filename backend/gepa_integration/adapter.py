"""
ParchiAdapter - GEPAAdapter implementation for Parchi.ai
Allows GEPA to optimize prompts for the clinical AI features.
"""

import json
import os
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass

# Import prompts from main app
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from prompts import INTAKE_SUMMARY_PROMPT, CONSULT_ANALYSIS_PROMPT, PATIENT_QA_PROMPT

from .datasets import format_example_for_prompt
from .metrics import IntakeSummaryMetric, ConsultAnalysisMetric, PatientQAMetric


@dataclass
class ExecutionTrace:
    """Captures execution details for GEPA reflection."""
    input_data: Dict[str, Any]
    prompt_used: str
    raw_output: str
    parsed_output: Any
    expected_output: Any
    score: float
    error: Optional[str] = None


class ParchiAdapter:
    """
    GEPA Adapter for Parchi.ai clinical prompts.
    
    Implements the GEPAAdapter interface to allow GEPA to:
    1. Evaluate prompt candidates against training data
    2. Extract execution traces for reflection and mutation
    
    Supports three prompt types:
    - intake_summary: AI intake summary generation
    - consult_analysis: SOAP note generation from transcripts
    - patient_qa: Patient record Q&A
    """
    
    # Mapping of prompt types to base prompts
    PROMPT_TEMPLATES = {
        "intake_summary": INTAKE_SUMMARY_PROMPT,
        "consult_analysis": CONSULT_ANALYSIS_PROMPT,
        "patient_qa": PATIENT_QA_PROMPT,
    }
    
    # Mapping of prompt types to metrics
    METRICS = {
        "intake_summary": IntakeSummaryMetric(),
        "consult_analysis": ConsultAnalysisMetric(),
        "patient_qa": PatientQAMetric(),
    }
    
    def __init__(
        self,
        prompt_type: str = "intake_summary",
        task_lm: str = "gemini/gemini-2.0-flash",
        temperature: float = 0.3,
        max_tokens: int = 1500,
    ):
        """
        Initialize the Parchi adapter.
        
        Args:
            prompt_type: Type of prompt to optimize
            task_lm: Model name for litellm (e.g., "google/gemma-3-27b-it", "openai/gpt-4.1-mini")
            temperature: Sampling temperature
            max_tokens: Maximum output tokens
        """
        self.prompt_type = prompt_type
        self.task_lm = task_lm
        self.temperature = temperature
        self.max_tokens = max_tokens
        
        if prompt_type not in self.PROMPT_TEMPLATES:
            raise ValueError(f"Unknown prompt type: {prompt_type}. "
                           f"Choose from: {list(self.PROMPT_TEMPLATES.keys())}")
        
        self.base_prompt = self.PROMPT_TEMPLATES[prompt_type]
        self.metric = self.METRICS[prompt_type]
    
    def evaluate(
        self,
        minibatch: List[Dict[str, Any]],
        candidate: Dict[str, str],
        **kwargs
    ) -> Tuple[List[float], List[ExecutionTrace]]:
        """
        Evaluate a prompt candidate on a minibatch of examples.
        
        Args:
            candidate: Dict with prompt component(s), e.g., {"system_prompt": "..."}
            minibatch: List of training examples to evaluate on
        
        Returns:
            Tuple of (scores, traces) where:
            - scores: List of float scores for each example
            - traces: List of ExecutionTrace objects for reflection
        """
        import litellm
        import time
        import random
        
        prompt_template = candidate.get("system_prompt", self.base_prompt)
        
        scores = []
        traces = []
        
        for i, example in enumerate(minibatch):
            # rudimentary rate limiting
            if i > 0:
                time.sleep(2)  # 2s delay between calls to stay under limit
                
            retries = 3
            backoff = 20  # Start with 20s for free tier
            
            try:
                # Format the prompt with example data
                prompt_vars = format_example_for_prompt(example, self.prompt_type)
                filled_prompt = prompt_template.format(**prompt_vars)
                
                raw_output = ""
                error_msg = None
                
                # Retry loop
                for attempt in range(retries):
                    try:
                        # Call the LLM
                        response = litellm.completion(
                            model=self.task_lm,
                            messages=[{"role": "user", "content": filled_prompt}],
                            temperature=self.temperature,
                            max_tokens=self.max_tokens,
                        )
                        raw_output = response.choices[0].message.content
                        break  # Success
                    except Exception as e:
                        if "RateLimitError" in str(type(e)) or "429" in str(e):
                            if attempt < retries - 1:
                                sleep_time = backoff * (attempt + 1) + random.uniform(1, 5)
                                print(f"  ⚠️ Rate limit hit. Sleeping {sleep_time:.1f}s...")
                                time.sleep(sleep_time)
                                continue
                        # Other errors or max retries
                        raise e
                
                # Parse output based on prompt type
                parsed_output = self._parse_output(raw_output)
                
                # Score the output
                expected = example.get("expected_output", {})
                context = {
                    "has_abnormal_values": self._check_abnormal_values(example),
                    "case_type": self.prompt_type,
                }
                score = self.metric(parsed_output, expected, context)
                
                # Create trace
                trace = ExecutionTrace(
                    input_data=example["input"],
                    prompt_used=filled_prompt,
                    raw_output=raw_output,
                    parsed_output=parsed_output,
                    expected_output=expected,
                    score=score,
                )
                
            except Exception as e:
                # Handle errors gracefully
                score = 0.0
                trace = ExecutionTrace(
                    input_data=example.get("input", {}),
                    prompt_used=prompt_template,
                    raw_output="",
                    parsed_output=None,
                    expected_output=example.get("expected_output", {}),
                    score=0.0,
                    error=str(e),
                )
            
            scores.append(score)
            traces.append(trace)
            
            # Print brief progress dot
            print(".", end="", flush=True)
        
        print() # Newline after batch
        return scores, traces
    
    def extract_traces_for_reflection(
        self,
        traces: List[ExecutionTrace],
        component_name: str = "system_prompt",
    ) -> str:
        """
        Extract textual content from traces for GEPA reflection.
        
        Args:
            traces: List of execution traces
            component_name: Name of the component being optimized
        
        Returns:
            Formatted string of trace summaries for the reflection LLM
        """
        trace_summaries = []
        
        for i, trace in enumerate(traces):
            summary = f"""
=== Example {i + 1} (Score: {trace.score:.2f}) ===

**Input Summary:**
{self._summarize_input(trace.input_data)}

**Expected Output:**
{json.dumps(trace.expected_output, indent=2)[:500]}

**Actual Output:**
{trace.raw_output[:800]}

**Error:** {trace.error or "None"}
"""
            trace_summaries.append(summary)
        
        return "\n\n".join(trace_summaries)
    
    def get_component_names(self) -> List[str]:
        """Return list of optimizable component names."""
        return ["system_prompt"]
    
    def get_seed_candidate(self) -> Dict[str, str]:
        """Return the initial seed prompt."""
        return {"system_prompt": self.base_prompt}
    
    def _parse_output(self, raw_output: str) -> Any:
        """Parse raw LLM output based on prompt type."""
        if self.prompt_type == "intake_summary":
            return self._parse_intake_output(raw_output)
        elif self.prompt_type == "consult_analysis":
            return self._parse_json_output(raw_output)
        else:
            return raw_output
    
    def _parse_intake_output(self, text: str) -> Dict:
        """Parse structured intake summary output."""
        def extract_section(text: str, section_name: str) -> str:
            marker = f"=== {section_name} ==="
            if marker not in text:
                return ""
            start = text.index(marker) + len(marker)
            next_section = text.find("===", start)
            if next_section == -1:
                next_section = len(text)
            return text[start:next_section].strip()
        
        def extract_bullets(text: str) -> List[str]:
            return [
                line.lstrip("-•").strip()
                for line in text.split("\n")
                if line.strip().startswith(("-", "•"))
            ]
        
        findings_text = extract_section(text, "KEY FINDINGS")
        
        return {
            "chief_complaint": extract_section(text, "CHIEF COMPLAINT"),
            "onset": extract_section(text, "ONSET"),
            "severity": extract_section(text, "SEVERITY"),
            "findings": extract_bullets(findings_text) if findings_text else [],
            "context": extract_section(text, "RELEVANT HISTORY"),
        }
    
    def _parse_json_output(self, raw_output: str) -> Dict:
        """Parse JSON output from LLM."""
        try:
            if "```json" in raw_output:
                json_str = raw_output.split("```json")[1].split("```")[0]
            elif "```" in raw_output:
                json_str = raw_output.split("```")[1].split("```")[0]
            else:
                json_str = raw_output
            return json.loads(json_str)
        except (json.JSONDecodeError, IndexError):
            return {"raw": raw_output}
    
    def _check_abnormal_values(self, example: Dict) -> bool:
        """Check if patient has abnormal vital values."""
        patient = example.get("input", {}).get("patient", {})
        vitals = patient.get("vitals", {})
        
        # Check for high BP
        if vitals.get("bp_systolic", 120) > 140:
            return True
        if vitals.get("bp_diastolic", 80) > 90:
            return True
        # Check for low SpO2
        if vitals.get("spo2", 98) < 95:
            return True
        # Check for abnormal HR
        hr = vitals.get("heart_rate", 75)
        if hr < 60 or hr > 100:
            return True
        
        return False
    
    def _summarize_input(self, input_data: Dict) -> str:
        """Create a brief summary of input data."""
        patient = input_data.get("patient", {})
        return f"""Patient: {patient.get('name', 'Unknown')}, {patient.get('age', '?')}y {patient.get('gender', '?')}
Conditions: {', '.join(patient.get('conditions', [])[:3]) or 'None'}
Medications: {len(patient.get('medications', []))} medications
Allergies: {', '.join(patient.get('allergies', [])) or 'None'}"""
