#!/usr/bin/env python3
"""
GEPA Prompt Optimization Runner for Parchi.ai
Main CLI script to run prompt optimization.

Usage:
    python -m backend.gepa_integration.optimize --prompt intake_summary --budget 50
    python -m backend.gepa_integration.optimize --prompt consult_analysis --budget 100 --reflection-lm gemini/gemini-1.5-pro-latest
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import the actual GEPA library
import gepa

# Import our local integration modules
from .adapter import ParchiAdapter
from .datasets import generate_training_set, generate_validation_set
from .metrics import IntakeSummaryMetric, ConsultAnalysisMetric, PatientQAMetric


def run_optimization(
    prompt_type: str = "intake_summary",
    task_lm: str = "gemini/gemini-2.0-flash",
    reflection_lm: str = "gemini/gemini-2.0-pro-exp-02-05",
    max_metric_calls: int = 50,
    train_size: int = 30,
    val_size: int = 10,
    output_dir: str = None,
    verbose: bool = True,
) -> dict:
    """
    Run GEPA optimization for a Parchi.ai prompt.
    
    Args:
        prompt_type: Which prompt to optimize ("intake_summary", "consult_analysis", "patient_qa")
        task_lm: Model being optimized (the production LLM)
        reflection_lm: Model used for reflection and mutation (should be strong)
        max_metric_calls: Budget for evaluation calls
        train_size: Number of training examples
        val_size: Number of validation examples
        output_dir: Directory to save results
        verbose: Print progress
    
    Returns:
        Dict with optimization results including best prompt and scores
    """
    if verbose:
        print(f"\n{'='*60}")
        print(f"  GEPA Prompt Optimization for Parchi.ai")
        print(f"{'='*60}")
        print(f"  Prompt Type: {prompt_type}")
        print(f"  Task LM: {task_lm}")
        print(f"  Reflection LM: {reflection_lm}")
        print(f"  Budget: {max_metric_calls} evaluation calls")
        print(f"{'='*60}\n")
    
    # Generate datasets
    if verbose:
        print("📊 Generating synthetic training data...")
    
    trainset = generate_training_set(prompt_type, num_examples=train_size, seed=42)
    valset = generate_validation_set(prompt_type, num_examples=val_size, seed=42)
    
    if verbose:
        print(f"   ✓ Training set: {len(trainset)} examples")
        print(f"   ✓ Validation set: {len(valset)} examples\n")
    
    # Create adapter
    adapter = ParchiAdapter(
        prompt_type=prompt_type,
        task_lm=task_lm,
    )
    
    # Get seed prompt
    seed_candidate = adapter.get_seed_candidate()
    
    if verbose:
        print("🌱 Seed prompt loaded")
        print(f"   Length: {len(seed_candidate['system_prompt'])} chars\n")
    
    # Define metric function for GEPA
    metric = adapter.metric
    
    def evaluate_fn(candidate, examples):
        """Evaluation function wrapper for GEPA."""
        scores, traces = adapter.evaluate(candidate, list(examples))
        return sum(scores) / len(scores) if scores else 0.0
    
    if verbose:
        print("🚀 Starting GEPA optimization...\n")
    
    # Run GEPA optimization
    try:
        result = gepa.optimize(
            seed_candidate=seed_candidate,
            trainset=list(trainset),
            valset=list(valset),
            task_lm=None, # Adapter handles the LM
            reflection_lm=reflection_lm,
            max_metric_calls=max_metric_calls,
            adapter=adapter,  # Use our custom adapter
        )
        
        best_candidate = result.best_candidate
        best_score = result.best_score if hasattr(result, 'best_score') else None
        
    except Exception as e:
        import traceback
        if verbose:
            print(f"⚠️  GEPA optimization error: {e}")
            traceback.print_exc()
            print("   Falling back to baseline evaluation...")
        
        # Fallback: just evaluate the seed prompt
        scores, traces = adapter.evaluate(seed_candidate, list(trainset)[:5])
        best_candidate = seed_candidate
        best_score = sum(scores) / len(scores) if scores else 0.0
        
        result = type('Result', (), {
            'best_candidate': best_candidate,
            'best_score': best_score,
            'iterations': 0,
        })()
    
    # Evaluate on validation set
    if verbose:
        print("\n📈 Evaluating on validation set...")
    
    val_scores, val_traces = adapter.evaluate(best_candidate, list(valset))
    val_score = sum(val_scores) / len(val_scores) if val_scores else 0.0
    
    if verbose:
        print(f"   Validation Score: {val_score:.3f}\n")
    
    # Prepare results
    results = {
        "prompt_type": prompt_type,
        "task_lm": task_lm,
        "reflection_lm": reflection_lm,
        "max_metric_calls": max_metric_calls,
        "seed_prompt": seed_candidate["system_prompt"],
        "optimized_prompt": best_candidate.get("system_prompt", best_candidate),
        "train_score": best_score,
        "val_score": val_score,
        "timestamp": datetime.now().isoformat(),
        "iterations": getattr(result, 'iterations', None),
    }
    
    # Save results
    if output_dir:
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        result_file = output_path / f"gepa_{prompt_type}_{timestamp}.json"
        
        with open(result_file, "w") as f:
            json.dump(results, f, indent=2)
        
        # Also save just the optimized prompt
        prompt_file = output_path / f"optimized_{prompt_type}.txt"
        with open(prompt_file, "w") as f:
            f.write(best_candidate.get("system_prompt", str(best_candidate)))
        
        if verbose:
            print(f"💾 Results saved to: {result_file}")
            print(f"💾 Optimized prompt saved to: {prompt_file}")
    
    if verbose:
        print(f"\n{'='*60}")
        print("  OPTIMIZATION COMPLETE")
        print(f"{'='*60}")
        print(f"  Validation Score: {val_score:.3f}")
        print(f"  Prompt Length: {len(best_candidate.get('system_prompt', ''))} chars")
        print(f"{'='*60}\n")
    
    return results


def main():
    parser = argparse.ArgumentParser(
        description="GEPA Prompt Optimization for Parchi.ai",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Optimize intake summary prompt with default settings
  python -m backend.gepa_integration.optimize --prompt intake_summary
  
  # Optimize with larger budget and specific models
  python -m backend.gepa_integration.optimize \\
      --prompt consult_analysis \\
      --budget 100 \\
      --task-lm google/gemma-3-27b-it \\
      --reflection-lm openai/gpt-4.1
  
  # Quick test run with minimal budget
  python -m backend.gepa_integration.optimize --prompt patient_qa --budget 10 --train-size 10
        """
    )
    
    parser.add_argument(
        "--prompt", "-p",
        type=str,
        required=True,
        choices=["intake_summary", "consult_analysis", "patient_qa"],
        help="Which prompt to optimize"
    )
    
    parser.add_argument(
        "--budget", "-b",
        type=int,
        default=50,
        help="Maximum number of evaluation calls (default: 50)"
    )
    
    parser.add_argument(
        "--task-lm",
        type=str,
        default="gemini/gemini-2.0-flash",
        help="Production model being optimized (default: gemini/gemini-2.0-flash)"
    )
    
    parser.add_argument(
        "--reflection-lm",
        type=str,
        default="gemini/gemini-2.0-pro-exp-02-05", # Stronger model for reflection
        help="Model for reflection/mutation (default: gemini/gemini-2.0-pro-exp-02-05)"
    )
    
    parser.add_argument(
        "--train-size",
        type=int,
        default=30,
        help="Number of training examples (default: 30)"
    )
    
    parser.add_argument(
        "--val-size",
        type=int,
        default=10,
        help="Number of validation examples (default: 10)"
    )
    
    parser.add_argument(
        "--output-dir", "-o",
        type=str,
        default="gepa_integration/results",
        help="Directory to save results (default: gepa_integration/results)"
    )
    
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Suppress progress output"
    )
    
    args = parser.parse_args()
    
    # Check for API keys
    if "gemini" in args.task_lm.lower() or "gemini" in args.reflection_lm.lower():
        if not os.getenv("GEMINI_API_KEY") and not os.getenv("GOOGLE_API_KEY"):
             # LiteLLM uses GEMINI_API_KEY or GOOGLE_API_KEY
            print("⚠️  Warning: GEMINI_API_KEY or GOOGLE_API_KEY not set. Optimization may fail.")
    
    # Run optimization
    results = run_optimization(
        prompt_type=args.prompt,
        task_lm=args.task_lm,
        reflection_lm=args.reflection_lm,
        max_metric_calls=args.budget,
        train_size=args.train_size,
        val_size=args.val_size,
        output_dir=args.output_dir,
        verbose=not args.quiet,
    )
    
    # Print optimized prompt
    if not args.quiet:
        print("\n📝 OPTIMIZED PROMPT:\n")
        print("-" * 60)
        optimized = results.get("optimized_prompt", "")
        if isinstance(optimized, dict):
            optimized = optimized.get("system_prompt", str(optimized))
        print(optimized[:2000])  # Truncate for display
        if len(optimized) > 2000:
            print(f"\n... [truncated, full prompt is {len(optimized)} chars]")
        print("-" * 60)


if __name__ == "__main__":
    main()
