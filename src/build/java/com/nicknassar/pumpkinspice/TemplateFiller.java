package com.nicknassar.pumpkinspice;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.FileInputStream;
import java.io.BufferedWriter;
import java.io.OutputStreamWriter;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.File;
import java.io.FileNotFoundException;

import java.nio.charset.Charset;

class TemplateFiller {
    private static class Error extends Exception {
	Error(Throwable cause) {
	    super(cause);
	}
	Error(String cause) {
	    super(cause);
	}
    }
    private static class TemplateConfig {
	public String source;
	public String destination;
	public String templateFolder;

        TemplateConfig() {
	    source = null;
	    destination = null;
	}
	
	boolean isValid() {
	    return source != null && destination != null;
	}

	static TemplateConfig parseArgs(String args[]) throws Error {
	    TemplateConfig config = new TemplateConfig();
	    String previousArg = null;
	    for (String arg: args) {
		if (config.source == null) {
		    config.source = arg;
		    
		    File src = new File(config.source);
		    config.templateFolder = src.getParent();

		} else if (config.destination == null) {
		    config.destination = arg;
		} else {
		    throw new Error("Too many arguments");
		}
	    }
	    if (config.source != null && config.destination == null) {
		if (config.source.endsWith(".template")) {
		    config.destination = config.source.substring(0, config.source.length()-9);
		}
	    }
	    return config;
	}
    }

    public static void main(String args[]){
	try {
	    TemplateConfig config = TemplateConfig.parseArgs(args);
	    if (!config.isValid()) {
		System.out.println("Usage: templatefiller filename.template [<filename>]");
		System.exit(1);
	    } else  {
		try {
		    TemplateFiller filler = new TemplateFiller(config);
		    filler.run();
		} catch (Exception e) {
		    System.out.println("Error filling "+config.destination+": "+e);
		    System.exit(2);
		}
	    }
	} catch (Error e) {
	    System.out.println("Error: "+e);
	    System.exit(1);
	}
    }

    private BufferedWriter out;
    private BufferedReader template;
    private TemplateConfig config;

    TemplateFiller(TemplateConfig config) {
	this.config = config;
    }

    public void run() throws Error {
	try {
	    out = new BufferedWriter(new OutputStreamWriter(new FileOutputStream(config.destination), Charset.forName("UTF-8").newEncoder()));
	    template = new BufferedReader(new InputStreamReader(new FileInputStream(config.source), Charset.forName("UTF-8").newDecoder()));
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
    
    private void fillLine(String line) throws IOException {
	int start = 0;
	int match = line.indexOf("{{", start);
	while (match > -1) {
	    out.write(line.substring(start, match));
	    
	    int end = line.indexOf("}}",match);
	    if (end == -1) {
		out.newLine();
		return;
	    } else {
		start = end+2;
	    }

	    String filename = line.substring(match+2,end);
	    dumpFile(filename);
	    
	    match = line.indexOf("{{", start);
	}
	out.write(line.substring(start, line.length()));
	out.newLine();
    }

    private void dumpFile(String filename) throws IOException {
	dump(new BufferedReader(new InputStreamReader(new FileInputStream(config.templateFolder+File.separatorChar+filename), Charset.forName("UTF-8").newDecoder())));
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
