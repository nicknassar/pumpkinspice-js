package com.nicknassar.pumpkinspice;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.FileInputStream;
import java.io.BufferedWriter;
import java.io.OutputStreamWriter;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.FileNotFoundException;

import java.nio.charset.Charset;

class Builder {
    private static class Error extends Exception {
	Error(Throwable cause) {
	    super(cause);
	}
    }
    private static class BuilderConfig {
	public boolean debug;
	public String source;
	public String destination;
	public String title;

	BuilderConfig() {
	    debug = false;
	    source = null;
	    destination = null;
	    title = null;
	}
	
	boolean isValid() {
	    return source != null && destination != null && title != null;
	}

	static BuilderConfig parseArgs(String args[]) {
	    BuilderConfig config = new BuilderConfig();
	    String previousArg = null;
	    for (String arg: args) {
		if (previousArg != null && previousArg.equals("--title")) {
		    config.title = arg;
		} else if ("--debug".equals(arg) || "-g".equals(arg)) {
		    config.debug = true;
		} else if ("--title".equals(arg)) {
		    // pass
		} else if (config.source == null) {
		    config.source = arg;
		} else if (config.destination == null) {
		    config.destination = arg;
		}
		previousArg = arg;
	    }
	    if (config.source != null && config.destination == null) {
		if (config.source.endsWith(".pumpkinspice")) {
		    if (config.debug) {
			config.destination = config.source.substring(0, config.source.length()-13)+".debug.html";
		    } else {
			config.destination = config.source.substring(0, config.source.length()-13)+".html";
		    }
		} else {
		    if (config.debug) {
			config.destination = config.source+".debug.html";
		    } else {
			config.destination = config.source+".html";
		    }
		}		
	    }
	    if (config.title == null) {
		config.title = config.source;
	    }
	    return config;
	}

    }

    public static void main(String args[]){
	BuilderConfig config = BuilderConfig.parseArgs(args);
	if (!config.isValid()) {
	    System.out.println("Builds an HTML page from a pumpkin spice program");
	    System.out.println("Usage: pumpkinspice2html [--debug] [--title \"Page Title\"] filename.pumpkinspice [<filename.html>]");
	    System.exit(1);
	} else  {
	    try {
		Builder builder = new Builder(config);
		builder.run();
	    } catch (Exception e) {
		System.out.println("Error building "+config.destination+": "+e);
		System.exit(2);
	    }
	}
    }

    private BufferedWriter out;
    private BufferedReader code;
    private BufferedReader template;
    private BufferedReader js;
    private BuilderConfig config;

    Builder(BuilderConfig config) {
	this.config = config;
    }

    public void run() throws Error {
	try {
	    out = new BufferedWriter(new OutputStreamWriter(new FileOutputStream(config.destination), Charset.forName("UTF-8").newEncoder()));
	    code = new BufferedReader(new InputStreamReader(new FileInputStream(config.source), Charset.forName("UTF-8").newDecoder()));
	    template = new BufferedReader(new InputStreamReader(getResourceAsStream("index.html.template"), Charset.forName("UTF-8").newDecoder()));
	    if (config.debug)
		js = new BufferedReader(new InputStreamReader(getResourceAsStream("pumpkinspice.js"), Charset.forName("UTF-8").newDecoder()));
	    else
		js = new BufferedReader(new InputStreamReader(getResourceAsStream("pumpkinspice.optimized.js"), Charset.forName("UTF-8").newDecoder()));
	} catch (FileNotFoundException e) {
	    throw new Error(e);
	}
	fillTemplate();
    }

    private void fillTemplate() throws Error {
	try {
	    
	    String line = template.readLine();
	    while (line != null) {
		fillLine(line);
		line = template.readLine();
	    }
	    out.close();
	} catch (IOException e) {
	    throw new Error(e);
	}
    }
    
    private InputStream getResourceAsStream(String name) {
	ClassLoader cl = this.getClass().getClassLoader();
	if (cl==null) {
	    return ClassLoader.getSystemResourceAsStream(name);
	}
	return cl.getResourceAsStream(name);
    }

    private void fillLine(String line) throws IOException {
	int start = 0;
	int match = line.indexOf("{{", start);
	while (match > -1) {
	    out.write(line.substring(start, match));
	    if (line.substring(match, match+6).equals("{{JS}}")) {
		start = match+6;
		dump(js);
	    } else if (line.substring(match, match+8).equals("{{CODE}}")) {
		start = match+8;
		dump(code);
	    } else if (line.substring(match, match+9).equals("{{TITLE}}")) {
		start = match+9;
		out.write(config.title
			  .replace("&", "&amp;")
			  .replace("<", "&lt;")
			  .replace(">", "&gt;")
			  .replace("\"", "&quot;")
			  );
	    } else {
		int end = line.indexOf("}}",match);
		if (end == -1)
		    return;
		else
		    start = end+2;
	    }
	    match = line.indexOf("{{", start);
	}
	out.write(line.substring(start, line.length()));
	out.newLine();
    }

    private void dump(BufferedReader in) throws IOException {
	String line = in.readLine();
	while (line != null) {
	    out.write(line);
	    line = in.readLine();

	    // No trailing newline
	    if (line != null)
		out.newLine();
	}
    }
}  
